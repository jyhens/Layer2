using System;
using System.Collections.Generic;

namespace LeavePlanner.Api.Models;

public class Employee
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = null!;
    public string? JobTitle { get; set; }

    // Navigation (später für EF Core hilfreich)
    public List<ProjectAssignment> ProjectAssignments { get; set; } = new();
    public List<LeaveRequest> LeaveRequests { get; set; } = new();
}
