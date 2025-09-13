using System;

namespace LeavePlanner.Api.Models;

public class LeaveRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid EmployeeId { get; set; }
    public Employee? Employee { get; set; }

    // Ein Arbeitstag
    public DateOnly Date { get; set; }

    // Standard = Requested
    public LeaveStatus Status { get; set; } = LeaveStatus.Requested;
}
