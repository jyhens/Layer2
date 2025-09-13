using System;

namespace LeavePlanner.Api.Models;

public class ProjectAssignment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid EmployeeId { get; set; }
    public Employee? Employee { get; set; }

    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }
}
