using LeavePlanner.Api.Models;

namespace LeavePlanner.Api.Data;

public static class DbSeeder
{
    public static void Seed(LeavePlannerDbContext db)
    {
        // Schon Daten drin? -> Nichts tun
        if (db.Employees.Any()) return;

        // ===== Employees (1 Admin, 2 Approver, 6 Dev) =====
        var admin = new Employee { Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"), Name = "Amira Admin",  JobTitle = "Admin",     Role = UserRole.Admin };
        var appr1 = new Employee { Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1"), Name = "Peter Product", JobTitle = "Approver", Role = UserRole.Approver };
        var appr2 = new Employee { Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2"), Name = "Sofia Supervisor", JobTitle = "Approver", Role = UserRole.Approver };

        var dev1 = new Employee { Id = Guid.Parse("cccccccc-cccc-cccc-cccc-ccccccccccc1"), Name = "Alice Nguyen",  JobTitle = "Developer", Role = UserRole.Employee };
        var dev2 = new Employee { Id = Guid.Parse("cccccccc-cccc-cccc-cccc-ccccccccccc2"), Name = "Bob Meier",     JobTitle = "Developer", Role = UserRole.Employee };
        var dev3 = new Employee { Id = Guid.Parse("cccccccc-cccc-cccc-cccc-ccccccccccc3"), Name = "Carlos Diaz",   JobTitle = "Developer", Role = UserRole.Employee };
        var dev4 = new Employee { Id = Guid.Parse("cccccccc-cccc-cccc-cccc-ccccccccccc4"), Name = "Daria Novak",   JobTitle = "Developer", Role = UserRole.Employee };
        var dev5 = new Employee { Id = Guid.Parse("cccccccc-cccc-cccc-cccc-ccccccccccc5"), Name = "Eren Kaya",     JobTitle = "Developer", Role = UserRole.Employee };
        var dev6 = new Employee { Id = Guid.Parse("cccccccc-cccc-cccc-cccc-ccccccccccc6"), Name = "Fatima Ali",    JobTitle = "Developer", Role = UserRole.Employee };

        db.Employees.AddRange(admin, appr1, appr2, dev1, dev2, dev3, dev4, dev5, dev6);

        // ===== Customers (generic) =====
        var customerA = new Customer { Id = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddd01"), Name = "Customer A" };
        var customerB = new Customer { Id = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddd02"), Name = "Customer B" };
        db.Customers.AddRange(customerA, customerB);

        // ===== Projects (generic names, realistic periods) =====
        var p1 = new Project
        {
            Id = Guid.Parse("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1"),
            Name = "Project A1",
            CustomerId = customerA.Id,
            StartDate = new DateOnly(2025, 1, 1),
            EndDate   = new DateOnly(2025, 12, 31)
        };

        var p2 = new Project
        {
            Id = Guid.Parse("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2"),
            Name = "Project B1",
            CustomerId = customerB.Id,
            StartDate = new DateOnly(2025, 3, 1),
            EndDate   = new DateOnly(2025, 11, 30)
        };

        var p3 = new Project
        {
            Id = Guid.Parse("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3"),
            Name = "Project B2",
            CustomerId = customerB.Id,
            StartDate = new DateOnly(2025, 9, 1),
            EndDate   = new DateOnly(2026, 3, 31) // reicht in 2026 hinein
        };

        db.Projects.AddRange(p1, p2, p3);

        // ===== Assignments (>= 3 Devs pro Projekt, zeitgleich aktiv) =====
        db.ProjectAssignments.AddRange(
            // p1 (A1)
            new ProjectAssignment { ProjectId = p1.Id, EmployeeId = dev1.Id }, // Alice
            new ProjectAssignment { ProjectId = p1.Id, EmployeeId = dev2.Id }, // Bob
            new ProjectAssignment { ProjectId = p1.Id, EmployeeId = dev3.Id }, // Carlos

            // p2 (B1)
            new ProjectAssignment { ProjectId = p2.Id, EmployeeId = dev4.Id }, // Daria
            new ProjectAssignment { ProjectId = p2.Id, EmployeeId = dev5.Id }, // Eren
            new ProjectAssignment { ProjectId = p2.Id, EmployeeId = dev6.Id }, // Fatima

            // p3 (B2) – Overlap
            new ProjectAssignment { ProjectId = p3.Id, EmployeeId = dev2.Id }, // Bob
            new ProjectAssignment { ProjectId = p3.Id, EmployeeId = dev4.Id }, // Daria
            new ProjectAssignment { ProjectId = p3.Id, EmployeeId = dev6.Id }  // Fatima
        );

        // ===== Leaves (Approved & Requested; erzeugt sinnvolle Konflikte) =====
        db.LeaveRequests.AddRange(
            // p1-Team — 2025-09-15
            new LeaveRequest {
                Id = Guid.Parse("ffffffff-ffff-ffff-ffff-fffffffffff1"),
                EmployeeId = dev2.Id, // Bob
                Date = new DateOnly(2025, 9, 15),
                Status = LeaveStatus.Approved,
                DecisionByEmployeeId = appr1.Id,
                DecisionAt = DateTimeOffset.Parse("2025-09-10T09:00:00Z"),
                DecisionComment = "OK by Peter"
            },
            new LeaveRequest {
                Id = Guid.Parse("ffffffff-ffff-ffff-ffff-fffffffffff2"),
                EmployeeId = dev1.Id, // Alice
                Date = new DateOnly(2025, 9, 15),
                Status = LeaveStatus.Requested
            },

            // p2-Team — 2025-09-20
            new LeaveRequest {
                Id = Guid.Parse("ffffffff-ffff-ffff-ffff-fffffffffff3"),
                EmployeeId = dev4.Id, // Daria
                Date = new DateOnly(2025, 9, 20),
                Status = LeaveStatus.Approved,
                DecisionByEmployeeId = appr2.Id,
                DecisionAt = DateTimeOffset.Parse("2025-09-12T10:00:00Z"),
                DecisionComment = "Capacity OK"
            },
            new LeaveRequest {
                Id = Guid.Parse("ffffffff-ffff-ffff-ffff-fffffffffff4"),
                EmployeeId = dev5.Id, // Eren
                Date = new DateOnly(2025, 9, 20),
                Status = LeaveStatus.Requested
            },

            // p3-Team — 2025-09-25
            new LeaveRequest {
                Id = Guid.Parse("ffffffff-ffff-ffff-ffff-fffffffffff5"),
                EmployeeId = dev6.Id, // Fatima
                Date = new DateOnly(2025, 9, 25),
                Status = LeaveStatus.Approved,
                DecisionByEmployeeId = appr1.Id,
                DecisionAt = DateTimeOffset.Parse("2025-09-15T08:30:00Z"),
                DecisionComment = "Approved by Peter"
            },
            new LeaveRequest {
                Id = Guid.Parse("ffffffff-ffff-ffff-ffff-fffffffffff6"),
                EmployeeId = dev2.Id, // Bob
                Date = new DateOnly(2025, 9, 25),
                Status = LeaveStatus.Requested
            },

            // Kontrollfall — 2025-09-27 (kein Konflikt)
            new LeaveRequest {
                Id = Guid.Parse("ffffffff-ffff-ffff-ffff-fffffffffff7"),
                EmployeeId = dev3.Id, // Carlos (nur p1)
                Date = new DateOnly(2025, 9, 27),
                Status = LeaveStatus.Requested
            }
        );

        db.SaveChanges();
    }
}
