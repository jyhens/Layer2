using LeavePlanner.Api.Data;
using LeavePlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LeavePlanner.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CustomersController : ControllerBase
{
    private readonly LeavePlannerDbContext _db;
    public CustomersController(LeavePlannerDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetAll()
        => Ok(await _db.Customers.Select(c => new { c.Id, c.Name }).ToListAsync());

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<object>> GetById(Guid id)
    {
        var c = await _db.Customers.FindAsync(id);
        return c is null ? NotFound() : Ok(new { c.Id, c.Name });
    }

    public record CustomerDto(string Name);

    [HttpPost]
    public async Task<ActionResult<object>> Create(CustomerDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");
        var c = new Customer { Name = dto.Name.Trim() };
        _db.Customers.Add(c);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = c.Id }, new { c.Id, c.Name });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, CustomerDto dto)
    {
        var c = await _db.Customers.FindAsync(id);
        if (c is null) return NotFound();
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");
        c.Name = dto.Name.Trim();
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var c = await _db.Customers.FindAsync(id);
        if (c is null) return NotFound();
        _db.Customers.Remove(c);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
