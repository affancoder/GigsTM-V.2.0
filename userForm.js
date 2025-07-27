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
    console.error('Firebase initialization error:', e);
}

// Reference to the user's profile data collection
const userProfilesRef = db.collection('userProfiles');

// Initialize Firebase is now done above with the config

// File input change handler
document.getElementById('profile-image').addEventListener('change', function(e) {
    const fileName = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
    const fileStatus = this.parentElement.querySelector('.file-status');
    fileStatus.textContent = fileName;
    
    // Show preview if it's an image
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const preview = document.getElementById('user-photo');
            if (preview) {
                preview.src = event.target.result;
            }
        };
        reader.readAsDataURL(e.target.files[0]);
    }
});

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up sign out buttons
    const setupSignOutButton = (buttonId) => {
        const btn = document.getElementById(buttonId);
        if (btn) {
            btn.addEventListener('click', signOutUser);
            console.log(`Sign out button '${buttonId}' set up successfully`);
        } else {
            console.warn(`Sign out button with ID '${buttonId}' not found`);
        }
    };
    
    // Setup the sign out button
    setupSignOutButton('sidebar-sign-out-btn');
    
    // Check if user is signed in
    auth.onAuthStateChanged(function(user) {
        const authStatus = document.getElementById('auth-status');
        if (user) {
            // User is signed in
            console.log('User is signed in:', user.email);
            updateUserInfo(user);
            if (authStatus) {
                authStatus.textContent = `Signed in as: ${user.email}`;
                authStatus.style.color = 'green';
            }
        } else {
            // No user is signed in
            console.log('No user is signed in');
            if (authStatus) {
                authStatus.textContent = 'Not signed in';
                authStatus.style.color = 'red';
            }
            // Redirect to login page
            window.location.href = 'index.html';
        }
    });
});

// Function to upload a file to Firebase Storage
async function uploadFile(file, path) {
    try {
        const storageRef = storage.ref();
        const fileRef = storageRef.child(`${path}/${Date.now()}_${file.name}`);
        await fileRef.put(file);
        return await fileRef.getDownloadURL();
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

// Function to save user profile data to Firestore
async function saveUserProfile(userId, profileData) {
    try {
        await userProfilesRef.doc(userId).set(profileData, { merge: true });
        return true;
    } catch (error) {
        console.error('Error saving profile:', error);
        throw error;
    }
}

// Function to sign out the user
function signOutUser() {
    try {
        // Show loading state on the button
        const signOutBtn = document.getElementById('form-sign-out-btn') || document.getElementById('sidebar-sign-out-btn');
        if (signOutBtn) {
            const originalBtnText = signOutBtn.innerHTML;
            signOutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing out...';
            signOutBtn.disabled = true;
        }
        
        // Sign out from Firebase
        auth.signOut().then(() => {
            console.log('User signed out successfully');
            // Clear any user data from session/local storage if needed
            sessionStorage.clear();
            localStorage.removeItem('user');
            
            // Redirect to home page
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error('Sign out error:', error);
            // Restore button state if button exists
            if (signOutBtn) {
                signOutBtn.innerHTML = originalBtnText;
                signOutBtn.disabled = false;
            }
            
            // Show error message
            alert('Error signing out: ' + (error.message || 'Unknown error occurred'));
        });
    } catch (error) {
        console.error('Error in signOutUser:', error);
        alert('An error occurred while signing out. Please try again.');
    }
}

// Handle form submission
document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
        alert('Please sign in to submit the form');
        return;
    }

    const submitBtn = document.getElementById('submit-btn');
    const originalBtnText = submitBtn.innerHTML;
    
    try {
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        
        // Get form values
        const formData = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            mobile: document.getElementById('mobile').value.trim(),
            jobRole: document.getElementById('job-role').value.trim(),
            gender: document.getElementById('gender').value,
            dob: document.getElementById('dob').value,
            country: document.getElementById('country').value,
            state: document.getElementById('state').value,
            city: document.getElementById('city').value,
            address: document.getElementById('address').value,
            pincode: document.getElementById('pincode').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Handle profile image upload if selected
        const profileImage = document.getElementById('profile-image').files[0];
        if (profileImage) {
            const imageUrl = await uploadFile(profileImage, `users/${user.uid}/profile`);
            formData.profileImageUrl = imageUrl;
        }

        // Save to Firestore
        await saveUserProfile(user.uid, formData);
        
        // Show success message
        alert('Profile updated successfully!');
        
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('Error submitting form: ' + error.message);
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
    const displayNameElement = document.getElementById('user-display-name');
    const emailElement = document.getElementById('user-email');
    const emailTextElement = document.getElementById('user-email-text');
    const phoneElement = document.getElementById('user-phone');
    const userPhotoElement = document.getElementById('user-photo');
    const userRoleElement = document.getElementById('user-role');
    const joinDateElement = document.getElementById('join-date');
    
    try {
        // Get additional user data from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data() || {};
        
        // Format user's display name (use Firestore fullName if available, otherwise fall back to auth display name or email)
        const displayName = userData.fullName || user.displayName || user.email?.split('@')[0] || 'User';
        
        // Update display name
        if (displayNameElement) {
            displayNameElement.textContent = displayName;
        }
        
        // Update email in both places (profile header and contact info)
        const userEmail = user.email || 'No email provided';
        if (emailElement) emailElement.textContent = userEmail;
        if (emailTextElement) emailTextElement.textContent = userEmail;
        
        // Update phone number from Firestore if available, otherwise from auth
        if (phoneElement) {
            const phoneNumber = userData.phoneNumber || 
                              user.phoneNumber || 
                              (user.providerData?.[0]?.phoneNumber) || 
                              'Not provided';
            phoneElement.textContent = phoneNumber;
        }
    
        // Update user photo/avatar
        if (userPhotoElement) {
            if (user.photoURL) {
                userPhotoElement.src = user.photoURL;
                userPhotoElement.alt = `${displayName}'s profile photo`;
            } else {
                // Generate a nice avatar with initials if no photo is available
                const nameParts = displayName.split(' ');
                const initials = nameParts.length > 1 
                    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
                    : displayName[0];
                userPhotoElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff&size=200`;
            }
        }
    
        // Update account type/role (you can customize this based on your user roles)
        if (userRoleElement) {
            userRoleElement.textContent = userData.role || 'Member'; // Use role from Firestore or default to 'Member'
        }
        
        // Update join date if available
        if (joinDateElement) {
            const joinDate = userData.createdAt?.toDate 
                ? userData.createdAt.toDate().toLocaleDateString()
                : (user.metadata?.creationTime 
                    ? new Date(user.metadata.creationTime).toLocaleDateString() 
                    : 'Today');
            joinDateElement.textContent = joinDate;
        }
    } catch (error) {
        console.error('Error updating user info:', error);
        // Fallback to basic info if Firestore fails
        if (displayNameElement && user.email) {
            displayNameElement.textContent = user.email.split('@')[0];
        }
        if (emailElement) emailElement.textContent = user.email || 'No email';
        if (phoneElement) phoneElement.textContent = user.phoneNumber || 'Not available';
    }
    
    // If you store additional user data in Firestore, you can fetch it here
    // Example:
    // fetchUserAdditionalData(user.uid);
}

// Example function to fetch additional user data from Firestore
/*
async function fetchUserAdditionalData(userId) {
    try {
        const db = firebase.firestore();
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            // Update UI with additional user data
            // Example: document.getElementById('user-display-name').textContent = userData.displayName || 'User';
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
}
*/
