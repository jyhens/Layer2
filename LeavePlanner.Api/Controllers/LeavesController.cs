using LeavePlanner.Api.Data;
using LeavePlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LeavePlanner.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LeavesController : ControllerBase
{
    private readonly LeavePlannerDbContext _db;
    public LeavesController(LeavePlannerDbContext db) => _db = db;

    // --- DTOs ---
    public record LeaveCreateDto(Guid EmployeeId, DateOnly Date);
    public record LeaveDto(Guid Id, Guid EmployeeId, DateOnly Date, LeaveStatus Status);

    public record ConflictEmployee(Guid EmployeeId, string EmployeeName);
    public record ConflictHint(Guid ProjectId, string ProjectName, List<ConflictEmployee> Employees);
    public record LeaveWithConflictsDto(LeaveDto Leave, List<ConflictHint> ConflictHints);

    // GET: api/leaves?employeeId=...&date=YYYY-MM-DD
    [HttpGet]
    public async Task<ActionResult<IEnumerable<LeaveDto>>> GetAll(
        [FromQuery] Guid? employeeId,
        [FromQuery] DateOnly? date)
    {
        var q = _db.LeaveRequests.AsNoTracking();

        if (employeeId is not null && employeeId != Guid.Empty)
            q = q.Where(l => l.EmployeeId == employeeId);

        if (date is not null)
            q = q.Where(l => l.Date == date);

        var list = await q
            .OrderBy(l => l.Date)
            .Select(l => new LeaveDto(l.Id, l.EmployeeId, l.Date, l.Status))
            .ToListAsync();

        return Ok(list);
    }

    // GET: api/leaves/{id}
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LeaveDto>> GetById(Guid id)
    {
        var l = await _db.LeaveRequests.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return l is null
            ? NotFound()
            : new LeaveDto(l.Id, l.EmployeeId, l.Date, l.Status);
    }

    // POST: api/leaves bei Beantragung nur gegen Approved anderer prüfen
    [HttpPost]
    public async Task<ActionResult<LeaveWithConflictsDto>> Create(LeaveCreateDto dto)
    {
        if (dto.EmployeeId == Guid.Empty) return BadRequest("EmployeeId is required.");

        var employeeExists = await _db.Employees.AsNoTracking().AnyAsync(e => e.Id == dto.EmployeeId);
        if (!employeeExists) return BadRequest("Employee does not exist.");

        // Ein Leave pro Mitarbeiter+Tag
        var duplicate = await _db.LeaveRequests.AsNoTracking()
            .AnyAsync(l => l.EmployeeId == dto.EmployeeId && l.Date == dto.Date);
        if (duplicate) return Conflict("Leave request for this employee and date already exists.");

        var entity = new LeaveRequest
        {
            EmployeeId = dto.EmployeeId,
            Date = dto.Date,
            Status = LeaveStatus.Requested
        };

        _db.LeaveRequests.Add(entity);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            // Sicherheitsnetz für Unique-Index (EmployeeId, Date)
            return Problem(title: "Create failed", detail: ex.Message, statusCode: StatusCodes.Status409Conflict);
        }

        // Konflikthinweise: bei Beantragung nur Approved anderer
        var conflictHints = await ComputeConflictHints(dto.EmployeeId, dto.Date, includeRequested: false);

        var result = new LeaveWithConflictsDto(
            new LeaveDto(entity.Id, entity.EmployeeId, entity.Date, entity.Status),
            conflictHints
        );

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, result);
    }

    // POST: api/leaves/{id}/approve
    [HttpPost("{id:guid}/approve")]
    public async Task<ActionResult<LeaveWithConflictsDto>> Approve(Guid id)
    {
        var current = await GetCurrentEmployeeAsync();
        if (current is null) return Unauthorized("Provide X-Employee-Id header.");
        if (current.Role != UserRole.Approver && current.Role != UserRole.Admin)
            return Forbid("Approver or Admin role required.");

        var entity = await _db.LeaveRequests.FirstOrDefaultAsync(x => x.Id == id);
        if (entity is null) return NotFound("Leave not found.");

        if (entity.EmployeeId == current.Id)
            return Forbid("You cannot approve your own leave.");

        if (entity.Status == LeaveStatus.Approved)
            return Conflict("Leave is already approved.");
        if (entity.Status == LeaveStatus.Rejected)
            return Conflict("Leave has been rejected and cannot be approved.");

        // Konflikte inkl. Requested anderer
        var conflictHints = await ComputeConflictHints(entity.EmployeeId, entity.Date, includeRequested: true);

        entity.Status = LeaveStatus.Approved;
        entity.DecisionByEmployeeId = current.Id;
        entity.DecisionAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync();

        var result = new LeaveWithConflictsDto(
            new LeaveDto(entity.Id, entity.EmployeeId, entity.Date, entity.Status),
            conflictHints
        );

        return Ok(result);
    }

    // POST: api/leaves/{id}/reject
    [HttpPost("{id:guid}/reject")]
    public async Task<ActionResult<LeaveDto>> Reject(Guid id, [FromBody] string? comment = null)
    {
        var current = await GetCurrentEmployeeAsync();
        if (current is null) return Unauthorized("Provide X-Employee-Id header.");
        if (current.Role != UserRole.Approver && current.Role != UserRole.Admin)
            return Forbid("Approver or Admin role required.");

        var entity = await _db.LeaveRequests.FirstOrDefaultAsync(x => x.Id == id);
        if (entity is null) return NotFound("Leave not found.");

        if (entity.EmployeeId == current.Id)
            return Forbid("You cannot reject your own leave.");

        if (entity.Status == LeaveStatus.Rejected)
            return Conflict("Leave is already rejected.");
        if (entity.Status == LeaveStatus.Approved)
            return Conflict("Approved leave cannot be rejected.");

        entity.Status = LeaveStatus.Rejected;
        entity.DecisionByEmployeeId = current.Id;
        entity.DecisionAt = DateTimeOffset.UtcNow;
        entity.DecisionComment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim();

        await _db.SaveChangesAsync();

        return Ok(new LeaveDto(entity.Id, entity.EmployeeId, entity.Date, entity.Status));
    }

    // --- Helpers ---

    private async Task<Employee?> GetCurrentEmployeeAsync()
    {
        if (!Request.Headers.TryGetValue("X-Employee-Id", out var values)) return null;
        if (!Guid.TryParse(values.FirstOrDefault(), out var id)) return null;
        return await _db.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
    }

    private async Task<List<ConflictHint>> ComputeConflictHints(Guid requesterEmployeeId, DateOnly date, bool includeRequested)
    {
        // Projekte, in denen der Antragsteller am Tag aktiv ist
        var activeProjectIds = await _db.ProjectAssignments.AsNoTracking()
            .Where(pa => pa.EmployeeId == requesterEmployeeId
                      && pa.Project != null
                      && pa.Project.StartDate <= date
                      && (pa.Project.EndDate == null || pa.Project.EndDate >= date))
            .Select(pa => pa.ProjectId)
            .Distinct()
            .ToListAsync();

        if (activeProjectIds.Count == 0)
            return new List<ConflictHint>();

        // Andere Mitarbeiter in diesen Projekten (nicht der Antragsteller)
        var teamAssignments = await _db.ProjectAssignments.AsNoTracking()
            .Where(pa => activeProjectIds.Contains(pa.ProjectId) && pa.EmployeeId != requesterEmployeeId)
            .Select(pa => new
            {
                pa.ProjectId,
                ProjectName = pa.Project!.Name,
                pa.EmployeeId,
                EmployeeName = pa.Employee!.Name
            })
            .ToListAsync();

        if (teamAssignments.Count == 0)
            return new List<ConflictHint>();

        var teamEmployeeIds = teamAssignments.Select(t => t.EmployeeId).Distinct().ToList();

        // Relevante Leaves der anderen am gleichen Tag
        var statuses = includeRequested
            ? new[] { LeaveStatus.Approved, LeaveStatus.Requested }
            : new[] { LeaveStatus.Approved };

        var conflictingEmployeeIds = await _db.LeaveRequests.AsNoTracking()
            .Where(l => l.Date == date
                     && statuses.Contains(l.Status)
                     && teamEmployeeIds.Contains(l.EmployeeId))
            .Select(l => l.EmployeeId)
            .Distinct()
            .ToListAsync();

        if (conflictingEmployeeIds.Count == 0)
            return new List<ConflictHint>();

        var relevant = teamAssignments.Where(t => conflictingEmployeeIds.Contains(t.EmployeeId)).ToList();

        // Aggregation pro Projekt
        return relevant
            .GroupBy(t => new { t.ProjectId, t.ProjectName })
            .Select(g => new ConflictHint(
                g.Key.ProjectId,
                g.Key.ProjectName,
                g.GroupBy(x => new { x.EmployeeId, x.EmployeeName })
                 .Select(x => new ConflictEmployee(x.Key.EmployeeId, x.Key.EmployeeName))
                 .ToList()
            ))
            .ToList();
    }
}
