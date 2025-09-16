using LeavePlanner.Api.Data;
using LeavePlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LeavePlanner.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmployeesController : ControllerBase
{
    private readonly LeavePlannerDbContext _db;
    public EmployeesController(LeavePlannerDbContext db) => _db = db;

    // GET: api/employees
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetAll()
    {
        var list = await _db.Employees
            .Select(e => new { e.Id, e.Name, e.JobTitle, e.Role })
            .ToListAsync();
        return Ok(list);
    }

    // GET: api/employees/{id}
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<object>> GetById(Guid id)
    {
        var e = await _db.Employees.FindAsync(id);
        return e is null ? NotFound() : Ok(new { e.Id, e.Name, e.JobTitle, e.Role });
    }

    public record EmployeeCreateDto(string Name, string? JobTitle);

    // POST: api/employees
    [HttpPost]
    public async Task<ActionResult<object>> Create(EmployeeCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");
        var e = new Employee { Name = dto.Name.Trim(), JobTitle = dto.JobTitle?.Trim() };
        _db.Employees.Add(e);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = e.Id }, new { e.Id, e.Name, e.JobTitle, e.Role });
    }

    public record EmployeeUpdateDto(string Name, string? JobTitle);

    // PUT: api/employees/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, EmployeeUpdateDto dto)
    {
        var e = await _db.Employees.FindAsync(id);
        if (e is null) return NotFound();
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");

        e.Name = dto.Name.Trim();
        e.JobTitle = dto.JobTitle?.Trim();
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/employees/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var e = await _db.Employees.FindAsync(id);
        if (e is null) return NotFound();
        _db.Employees.Remove(e);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
