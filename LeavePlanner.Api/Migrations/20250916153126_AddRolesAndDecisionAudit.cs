using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeavePlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRolesAndDecisionAudit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DecisionAt",
                table: "LeaveRequests",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DecisionByEmployeeId",
                table: "LeaveRequests",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DecisionComment",
                table: "LeaveRequests",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Role",
                table: "Employees",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DecisionAt",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "DecisionByEmployeeId",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "DecisionComment",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "Role",
                table: "Employees");
        }
    }
}
