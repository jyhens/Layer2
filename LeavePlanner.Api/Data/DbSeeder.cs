using LeavePlanner.Api.Models;

namespace LeavePlanner.Api.Data;

public static class DbSeeder
{
    public static void Seed(LeavePlannerDbContext db)
    {
        if (db.Employees.Any()) return;

        var alice = new Employee { Name = "Lily", JobTitle = "Developer" };
        var bob   = new Employee { Name = "Sara", JobTitle = "QA" };
        var cust  = new Customer { Name = "Layer 2" };
        var proj  = new Project {
            Name = "Migration",
            Customer = cust,
            StartDate = new DateOnly(2025, 9, 1)
        };

        db.AddRange(alice, bob, cust, proj);
        db.Add(new ProjectAssignment { Employee = alice, Project = proj });
        db.SaveChanges();
    }
}
