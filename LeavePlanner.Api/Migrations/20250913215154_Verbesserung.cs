using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeavePlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class Verbesserung : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddCheckConstraint(
                name: "CK_Project_Period",
                table: "Projects",
                sql: "EndDate IS NULL OR EndDate >= StartDate");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Project_Period",
                table: "Projects");
        }
    }
}
