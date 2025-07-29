// Use firebaseConfig from window object or initialize with empty config
const firebaseConfig = window.firebaseConfig || {};

// Initialize Firebase services
let app, auth, db, storage;

try {
  app = firebase.app();
  auth = firebase.auth();
  db = firebase.firestore();
  storage = firebase.storage();
} catch (e) {
  console.error("Firebase initialization error:", e);
}

// Backend API URL - Change this to your deployed backend URL
const API_BASE_URL = "https://gigstm-backend.onrender.com/api";

// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // Set up sign out buttons
  const setupSignOutButton = (buttonId) => {
    const btn = document.getElementById(buttonId);
    if (btn) {
      btn.addEventListener("click", signOutUser);
      console.log(`Sign out button '${buttonId}' set up successfully`);
    } else {
      console.warn(`Sign out button with ID '${buttonId}' not found`);
    }
  };

  // Setup the sign out button
  setupSignOutButton("sidebar-sign-out-btn");
  setupSignOutButton("form-sign-out-btn");

  // Check if user is signed in
  auth.onAuthStateChanged(function (user) {
    const authStatus = document.getElementById("auth-status");
    if (user) {
      // User is signed in
      console.log("User is signed in:", user.email);
      updateUserInfo(user);
      loadUserProfile(user.uid); // Load existing profile data
      if (authStatus) {
        authStatus.textContent = `Signed in as: ${user.email}`;
        authStatus.style.color = "green";
      }
    } else {
      // No user is signed in
      console.log("No user is signed in");
      if (authStatus) {
        authStatus.textContent = "Not signed in";
        authStatus.style.color = "red";
      }
      // Redirect to login page
      window.location.href = "index.html";
    }
  });
});

// Function to load existing user profile data from MongoDB
async function loadUserProfile(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/profile/${userId}`);
    const result = await response.json();

    if (result.success && result.data) {
      const profile = result.data;

      // Populate form fields with existing data
      document.getElementById("name").value = profile.name || "";
      document.getElementById("email").value = profile.email || "";
      document.getElementById("mobile").value = profile.mobile || "";
      document.getElementById("job-role").value = profile.jobRole || "";
      document.getElementById("gender").value = profile.gender || "";

      if (profile.dob) {
        const dob = new Date(profile.dob);
        document.getElementById("dob").value = dob.toISOString().split("T")[0];
      }

      document.getElementById("aadhaar").value = profile.aadhaar || "";
      document.getElementById("pan").value = profile.pan || "";
      document.getElementById("country").value = profile.country || "";
      document.getElementById("state").value = profile.state || "";
      document.getElementById("city").value = profile.city || "";
      document.getElementById("address1").value = profile.address?.line1 || "";
      document.getElementById("address2").value = profile.address?.line2 || "";
      document.getElementById("pincode").value = profile.pincode || "";
      document.getElementById("about").value = profile.about || "";

      // Update profile image if available
      if (profile.files?.profileImage) {
        const preview = document.getElementById("user-photo");
        if (preview) {
          preview.src = `${API_BASE_URL.replace("/api", "")}/uploads/${
            profile.files.profileImage
          }`;
        }
      }

      console.log("Profile data loaded successfully");
    }
  } catch (error) {
    console.error("Error loading profile:", error);
  }
}

// File input change handler for profile image
document
  .getElementById("profile-image")
  .addEventListener("change", function (e) {
    const fileName = e.target.files[0]
      ? e.target.files[0].name
      : "No file chosen";
    const fileStatus = this.parentElement.querySelector(".file-status");
    fileStatus.textContent = fileName;

    // Show preview if it's an image
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = function (event) {
        const preview = document.getElementById("user-photo");
        if (preview) {
          preview.src = event.target.result;
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  });

// Function to sign out the user
function signOutUser() {
  try {
    // Show loading state on the button
    const signOutBtn =
      document.getElementById("form-sign-out-btn") ||
      document.getElementById("sidebar-sign-out-btn");
    if (signOutBtn) {
      const originalBtnText = signOutBtn.innerHTML;
      signOutBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Signing out...';
      signOutBtn.disabled = true;
    }

    // Sign out from Firebase
    auth
      .signOut()
      .then(() => {
        console.log("User signed out successfully");
        // Clear any user data from session/local storage if needed
        sessionStorage.clear();

        // Redirect to home page
        window.location.href = "index.html";
      })
      .catch((error) => {
        console.error("Sign out error:", error);
        // Restore button state if button exists
        if (signOutBtn) {
          signOutBtn.innerHTML = originalBtnText;
          signOutBtn.disabled = false;
        }

        // Show error message
        alert(
          "Error signing out: " + (error.message || "Unknown error occurred")
        );
      });
  } catch (error) {
    console.error("Error in signOutUser:", error);
    alert("An error occurred while signing out. Please try again.");
  }
}

// Handle form submission - Updated to use MongoDB backend
document
  .getElementById("profile-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert("Please sign in to submit the form");
      return;
    }

    const submitBtn = document.getElementById("submit-btn");
    const originalBtnText = submitBtn.innerHTML;

    try {
      // Show loading state
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Submitting...';

      // Create FormData object for file uploads
      const formData = new FormData();

      // Add user ID
      formData.append("userId", user.uid);

      // Add form fields
      formData.append("name", document.getElementById("name").value.trim());
      formData.append("email", document.getElementById("email").value.trim());
      formData.append("mobile", document.getElementById("mobile").value.trim());
      formData.append(
        "jobRole",
        document.getElementById("job-role").value.trim()
      );
      formData.append("gender", document.getElementById("gender").value);
      formData.append("dob", document.getElementById("dob").value);
      formData.append(
        "aadhaar",
        document.getElementById("aadhaar").value.trim()
      );
      formData.append("pan", document.getElementById("pan").value.trim());
      formData.append("country", document.getElementById("country").value);
      formData.append("state", document.getElementById("state").value);
      formData.append("city", document.getElementById("city").value);
      formData.append(
        "address1",
        document.getElementById("address1").value.trim()
      );
      formData.append(
        "address2",
        document.getElementById("address2").value.trim()
      );
      formData.append(
        "pincode",
        document.getElementById("pincode").value.trim()
      );
      formData.append("about", document.getElementById("about").value.trim());

      // Add file uploads
      const profileImage = document.getElementById("profile-image").files[0];
      const aadhaarFile = document.getElementById("aadhaar-file").files[0];
      const panFile = document.getElementById("pan-file").files[0];
      const resumeFile = document.getElementById("resume-file").files[0];

      if (profileImage) formData.append("profileImage", profileImage);
      if (aadhaarFile) formData.append("aadhaarFile", aadhaarFile);
      if (panFile) formData.append("panFile", panFile);
      if (resumeFile) formData.append("resumeFile", resumeFile);

      // Submit to MongoDB backend
      const response = await fetch(`${API_BASE_URL}/submit-profile`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        alert("Profile updated successfully!");
        console.log("Profile saved to MongoDB:", result.data);
      } else {
        throw new Error(result.message || "Failed to save profile");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Error submitting form: " + error.message);
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });

// Function to update user information in the sidebar
async function updateUserInfo(user) {
  if (!user) return;

  // Get all user info elements
  const displayNameElement = document.getElementById("user-display-name");
  const emailElement = document.getElementById("user-email");
  const emailTextElement = document.getElementById("user-email-text");
  const phoneElement = document.getElementById("user-phone");
  const userPhotoElement = document.getElementById("user-photo");
  const userRoleElement = document.getElementById("user-role");
  const joinDateElement = document.getElementById("join-date");

  try {
    // Get additional user data from Firestore (keeping Firebase for auth, MongoDB for profiles)
    const userDoc = await db.collection("users").doc(user.uid).get();
    const userData = userDoc.data() || {};

    // Format user's display name
    const displayName =
      userData.fullName ||
      user.displayName ||
      user.email?.split("@")[0] ||
      "User";

    // Update display name
    if (displayNameElement) {
      displayNameElement.textContent = displayName;
    }

    // Update email in both places
    const userEmail = user.email || "No email provided";
    if (emailElement) emailElement.textContent = userEmail;
    if (emailTextElement) emailTextElement.textContent = userEmail;

    // Update phone number
    if (phoneElement) {
      const phoneNumber =
        userData.phoneNumber ||
        user.phoneNumber ||
        user.providerData?.[0]?.phoneNumber ||
        "Not provided";
      phoneElement.textContent = phoneNumber;
    }

    // Update user photo/avatar
    if (userPhotoElement) {
      if (user.photoURL) {
        userPhotoElement.src = user.photoURL;
        userPhotoElement.alt = `${displayName}'s profile photo`;
      } else {
        // Generate a nice avatar with initials if no photo is available
        const nameParts = displayName.split(" ");
        const initials =
          nameParts.length > 1
            ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
            : displayName[0];
        userPhotoElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
          initials
        )}&background=random&color=fff&size=200`;
      }
    }

    // Update account type/role
    if (userRoleElement) {
      userRoleElement.textContent = userData.role || "Member";
    }

    // Update join date if available
    if (joinDateElement) {
      const joinDate = userData.createdAt?.toDate
        ? userData.createdAt.toDate().toLocaleDateString()
        : user.metadata?.creationTime
        ? new Date(user.metadata.creationTime).toLocaleDateString()
        : "Today";
      joinDateElement.textContent = joinDate;
    }
  } catch (error) {
    console.error("Error updating user info:", error);
    // Fallback to basic info if Firestore fails
    if (displayNameElement && user.email) {
      displayNameElement.textContent = user.email.split("@")[0];
    }
    if (emailElement) emailElement.textContent = user.email || "No email";
    if (phoneElement)
      phoneElement.textContent = user.phoneNumber || "Not available";
  }
}

// Handle file input interactions for all file inputs
document.querySelectorAll('input[type="file"]').forEach((input) => {
  input.addEventListener("change", function () {
    const fileStatus = this.parentElement.querySelector(".file-status");
    if (this.files.length > 0) {
      fileStatus.textContent = this.files[0].name;
    } else {
      fileStatus.textContent = "No file chosen";
    }
  });
});
