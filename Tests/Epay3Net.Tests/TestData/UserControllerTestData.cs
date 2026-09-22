using System.Collections.Generic;
using Epay3Net.Models;

namespace Epay3Net.Tests.TestData
{
    public static class UserControllerTestData
    {
        public static AddChangeUserRequest ValidCreateRequest => new AddChangeUserRequest
        {
            Login = "valid",
            Email = "valid@test.com",
            FirstName = "First",
            LastName = "Last",
            Company = "Co",
            Status = "active",
            PrimaryAccountType = "payer",
            Role = "user"
        };

        public static AddChangeUserRequest ValidUpdateRequest => new AddChangeUserRequest
        {
            UserId = "123",
            Login = "valid",
            Email = "valid@test.com",
            FirstName = "First",
            LastName = "Last",
            Company = "Co",
            Status = "active",
            PrimaryAccountType = "payer",
            Role = "user"
        };

        public static IEnumerable<object[]> InvalidCreateRequests
        {
            get
            {
                // Login
                yield return new object[] { Modify(ValidCreateRequest, r => r.Login = ""), "User ID is required" };

                // Email
                yield return new object[] { Modify(ValidCreateRequest, r => r.Email = ""), "Email is required" };
                yield return new object[] { Modify(ValidCreateRequest, r => r.Email = "invalid-email"), "Email is invalid" };

                // First Name
                yield return new object[] { Modify(ValidCreateRequest, r => r.FirstName = ""), "First Name is required" };

                // Last Name
                yield return new object[] { Modify(ValidCreateRequest, r => r.LastName = ""), "Last Name is required" };

                // Company
                yield return new object[] { Modify(ValidCreateRequest, r => r.Company = ""), "Company is required" };

                // Status
                yield return new object[] { Modify(ValidCreateRequest, r => r.Status = ""), "Status is required" };
                yield return new object[] { Modify(ValidCreateRequest, r => r.Status = "invalid"), "Status is invalid" };

                // Account Type
                yield return new object[] { Modify(ValidCreateRequest, r => r.PrimaryAccountType = ""), "Account Type is required" };
                yield return new object[] { Modify(ValidCreateRequest, r => r.PrimaryAccountType = "invalid"), "Account Type is invalid" };

                // Role
                yield return new object[] { Modify(ValidCreateRequest, r => r.Role = ""), "Role is required" };
                yield return new object[] { Modify(ValidCreateRequest, r => r.Role = "invalid"), "Role is invalid" };
            }
        }

        public static IEnumerable<object[]> InvalidUpdateRequests
        {
            get
            {
                // UserId is checked separately (null check)

                // Login
                yield return new object[] { Modify(ValidUpdateRequest, r => r.Login = ""), "User ID is required" };

                // Email
                yield return new object[] { Modify(ValidUpdateRequest, r => r.Email = ""), "Email is required" };
                // Update doesn't regex check email in current implementation? Let's check existing tests.
                // UserControllerTests does not have Update_ReturnsBadRequest_WhenEmailInvalid. 
                // Checks ValidateUpdateUserRequest logic...
                // ValidateUpdateUserRequest: 
                // if (CheckRequired(errors, request.Email, "user.error.email", "Email is required", language))
                // { if (!request.Email.Equals...

                // Wait, ValidateCreateUserRequest has regex check:
                // else if (!this.emailValidationRE.IsMatch(request.Email))

                // ValidateUpdateUserRequest code I wrote:
                // if (CheckRequired(errors, request.Email, "user.error.email", "Email is required", language)) ...
                // It does NOT seem to have the regex check in my refactored version?
                // Let me double check the ViewFile output of ValidateUpdateUserRequest in Step 2066.

                // First Name
                yield return new object[] { Modify(ValidUpdateRequest, r => r.FirstName = ""), "First Name is required" };

                // Last Name
                yield return new object[] { Modify(ValidUpdateRequest, r => r.LastName = ""), "Last Name is required" };

                // Company
                yield return new object[] { Modify(ValidUpdateRequest, r => r.Company = ""), "Company is required" };

                // Status
                yield return new object[] { Modify(ValidUpdateRequest, r => r.Status = ""), "Status is required" };
                yield return new object[] { Modify(ValidUpdateRequest, r => r.Status = "invalid"), "Status is invalid" };

                // Account Type
                yield return new object[] { Modify(ValidUpdateRequest, r => r.PrimaryAccountType = ""), "Account Type is required" };
                yield return new object[] { Modify(ValidUpdateRequest, r => r.PrimaryAccountType = "invalid"), "Account Type is invalid" };

                // Role
                yield return new object[] { Modify(ValidUpdateRequest, r => r.Role = ""), "Role is required" };
                yield return new object[] { Modify(ValidUpdateRequest, r => r.Role = "invalid"), "Role is invalid" };
            }
        }

        private static AddChangeUserRequest Modify(AddChangeUserRequest request, System.Action<AddChangeUserRequest> modifier)
        {
            modifier(request);
            return request;
        }
    }
}
