using LeavePlanner.Api.Data;
using LeavePlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LeavePlanner.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly LeavePlannerDbContext _db;
    public ProjectsController(LeavePlannerDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetAll()
    {
        var list = await _db.Projects
            .Include(p => p.Customer)
            .Select(p => new {
                p.Id,
                p.Name,
                Customer = p.Customer != null ? new { p.Customer.Id, p.Customer.Name } : null,
                p.StartDate,
                p.EndDate
            })
            .ToListAsync();
        return Ok(list);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<object>> GetById(Guid id)
    {
        var p = await _db.Projects.Include(p => p.Customer).FirstOrDefaultAsync(p => p.Id == id);
        return p is null
            ? NotFound()
            : Ok(new { p.Id, p.Name, CustomerId = p.CustomerId, p.StartDate, p.EndDate });
    }

    public record ProjectCreateDto(string Name, Guid CustomerId, DateOnly StartDate, DateOnly? EndDate);

    [HttpPost]
    public async Task<ActionResult<object>> Create(ProjectCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");
        var existsCustomer = await _db.Customers.AnyAsync(c => c.Id == dto.CustomerId);
        if (!existsCustomer) return BadRequest("Customer does not exist.");

        var p = new Project
        {
            Name = dto.Name.Trim(),
            CustomerId = dto.CustomerId,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate
        };

        _db.Projects.Add(p);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = p.Id }, new { p.Id, p.Name, p.CustomerId, p.StartDate, p.EndDate });
    }

    public record ProjectUpdateDto(string Name, Guid CustomerId, DateOnly StartDate, DateOnly? EndDate);

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, ProjectUpdateDto dto)
    {
        var p = await _db.Projects.FindAsync(id);
        if (p is null) return NotFound();

        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");
        var existsCustomer = await _db.Customers.AnyAsync(c => c.Id == dto.CustomerId);
        if (!existsCustomer) return BadRequest("Customer does not exist.");

        p.Name = dto.Name.Trim();
        p.CustomerId = dto.CustomerId;
        p.StartDate = dto.StartDate;
        p.EndDate = dto.EndDate;

        try
        {
            await _db.SaveChangesAsync();
            return NoContent();
        }
        catch (DbUpdateException ex)
        {
            // falls du Check-Constraint für Perioden gesetzt hast
            return Problem(title: "Update failed", detail: ex.Message, statusCode: StatusCodes.Status409Conflict);
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var p = await _db.Projects.FindAsync(id);
        if (p is null) return NotFound();
        _db.Projects.Remove(p);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ---- Assign Employee to Project ----
    public record AssignDto(Guid EmployeeId);

    // POST: api/projects/{projectId}/assignments
    [HttpPost("{projectId:guid}/assignments")]
    public async Task<IActionResult> AssignEmployee(Guid projectId, AssignDto dto)
    {
        var projectExists = await _db.Projects.AnyAsync(p => p.Id == projectId);
        if (!projectExists) return NotFound("Project not found.");

        var employeeExists = await _db.Employees.AnyAsync(e => e.Id == dto.EmployeeId);
        if (!employeeExists) return BadRequest("Employee not found.");

        var already = await _db.ProjectAssignments
            .AnyAsync(pa => pa.ProjectId == projectId && pa.EmployeeId == dto.EmployeeId);
        if (already) return Conflict("Employee already assigned to this project.");

        _db.ProjectAssignments.Add(new ProjectAssignment
        {
            ProjectId = projectId,
            EmployeeId = dto.EmployeeId
        });

        await _db.SaveChangesAsync();
        return NoContent();
    }
}
