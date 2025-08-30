// scripts.js
// Firebase Core and Auth
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// Firestore Database
import { getFirestore, doc, setDoc, getDoc, addDoc, updateDoc, deleteDoc, collection, onSnapshot, serverTimestamp, query, where, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJRXZqHsSKT6ea1bVM9ctycAlg0cqeT50",
  authDomain: "inbound-system-prod.firebaseapp.com",
  projectId: "inbound-system-prod",
  storageBucket: "inbound-system-prod.firebasestorage.app",
  messagingSenderId: "1080446836155",
  appId: "1:1080446836155:web:da8d3f12f76d83b408389e"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// Your Gemini API Key - Updated with the provided key
const geminiApiKey = "AIzaSyAVxhKKuLVWKQzAh9XTNITsQ4LF3_TlNzg";
async function callGeminiAPI(prompt) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`;
    const payload = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
        },
        safetySettings: [
            {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_NONE"
            },
            {
                category: "HARM_CATEGORY_HATE_SPEECH", 
                threshold: "BLOCK_NONE"
            },
            {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_NONE"
            },
            {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_NONE"
            }
        ]
    };
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error:", errorData);
            throw new Error(`API request failed with status ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const result = await response.json();
        
        if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
            return result.candidates[0].content.parts[0].text;
        } else {
            console.error("Unexpected API response structure:", result);
            return "ขออภัยค่ะ ไม่สามารถประมวลผลคำตอบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง";
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw error;
    }
}
document.addEventListener('DOMContentLoaded', () => {
    // Hide loading container when page is fully loaded
    const loadingContainer = document.getElementById('loading-container');
    if (loadingContainer) {
        loadingContainer.style.display = 'none';
    }
    
    const views = {
        loginRegister: document.getElementById('login-register-view'),
        mainMenu: document.getElementById('main-menu-view'),
        transfers: document.getElementById('transfers-view'),
        aiChat: document.getElementById('ai-chat-view'),
        calendar: document.getElementById('calendar-view'),
        statistics: document.getElementById('statistics-view'),
        todaysPlan: document.getElementById('todays-plan-view'),
        kpi: document.getElementById('kpi-view'),
        profile: document.getElementById('profile-view'),
        checkProduct: document.getElementById('check-product-view')
    };
    
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const logoutButtonMain = document.getElementById('logout-button-main');
    const inboundForm = document.getElementById('inbound-form');
    const saveButton = document.getElementById('save-button');
    const transfersMenuView = document.getElementById('transfers-menu-view');
    const formView = document.getElementById('form-view');
    const detailsView = document.getElementById('details-view');
    const issuesView = document.getElementById('issues-view');
    const completedView = document.getElementById('completed-view');
    const checkView = document.getElementById('check-view');
    const checkProductView = document.getElementById('check-product-view');
    const backToPreviousViewButton = document.getElementById('back-to-previous-view-button');
    const detailsModal = document.getElementById('details-modal');
    const detailsModalContent = document.getElementById('details-modal-content');
    const confirmationModal = document.getElementById('confirmation-modal');
    const confirmOkBtn = document.getElementById('confirm-ok-btn');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    const confirmationMessage = document.getElementById('confirmation-message');
    const profileForm = document.getElementById('profile-form');
    const changePasswordForm = document.getElementById('change-password-form');
    const scoreModal = document.getElementById('score-modal');
    const starPointsModal = document.getElementById('star-points-modal');
    const scoreForm = document.getElementById('score-form');
    const profilePicUpload = document.getElementById('profile-pic-upload');
    const profilePicPreview = document.getElementById('profile-pic-preview');
    const defaultAvatarContainer = document.getElementById('default-avatar-container');
    const backupModal = document.getElementById('backup-modal');
    let currentChartInstances = {};
    let isAdmin = false;
    let currentUser = null;
    let currentUserProfile = null;
    let allUsers = [];
    let allScores = [];
    let allStarPoints = [];
    let unsubscribeUsers = null;
    let unsubscribeTransfers = null;
    let unsubscribeIssues = null;
    let unsubscribeScores = null;
    let unsubscribeStarPoints = null;
    let allTransfersData = [];
    let completedTransfersData = [];
    let issuesData = {};
    let currentTforData = null;
    let previousView = null;
    let confirmCallback = null;
    let uploadedImagesBase64 = [];
    let newProfilePicBase64 = null;
    
    function showNotification(message, isSuccess = true) {
        const toast = document.getElementById('notification-toast');
        const messageP = document.getElementById('notification-message');
        if (!toast || !messageP) return;
        messageP.textContent = message;
        toast.className = `fixed top-5 right-5 text-white px-6 py-3 rounded-lg shadow-lg transform transition-transform duration-500 z-50 ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`;
        toast.classList.remove('translate-x-full');
        setTimeout(() => {
            toast.classList.add('translate-x-full');
        }, 3000);
    }
    
    function showMainView(viewToShow) {
        Object.values(views).forEach(v => v.style.display = 'none');
        if (viewToShow) viewToShow.style.display = 'block';
        window.scrollTo(0, 0);
    }
    
    function showAuthForm(formToShow) {
        loginForm.classList.toggle('hidden', formToShow !== 'login');
        registerForm.classList.toggle('hidden', formToShow !== 'register');
        loginTab.classList.toggle('bg-fuchsia-600', formToShow === 'login');
        loginTab.classList.toggle('text-white', formToShow === 'login');
        registerTab.classList.toggle('bg-fuchsia-600', formToShow === 'register');
        registerTab.classList.toggle('text-white', formToShow === 'register');
    }
    
    loginTab.addEventListener('click', () => showAuthForm('login'));
    registerTab.addEventListener('click', () => showAuthForm('register'));
    
    function updateUserDisplays(profile) {
        const displayElements = document.querySelectorAll('.user-display');
        const roleDisplay = document.getElementById('user-role-display');
        if (profile) {
            const fullName = `${profile.firstName} ${profile.lastName}`;
            displayElements.forEach(el => {
                el.textContent = fullName;
                el.classList.remove('hidden');
            });
            if(roleDisplay) {
                roleDisplay.textContent = profile.role || 'Officer';
                roleDisplay.classList.remove('hidden');
            }
        } else {
            displayElements.forEach(el => el.classList.add('hidden'));
             if(roleDisplay) roleDisplay.classList.add('hidden');
        }
    }
    
    function updateUIForRoles() {
        if (!currentUserProfile) return;
        const role = currentUserProfile.role || 'Officer';
        const roles = {
            'Admin': ['admin-only', 'admin-supervisor-only', 'senior-and-up', 'delete-permission'],
            'Supervisor': ['admin-supervisor-only', 'senior-and-up', 'delete-permission'],
            'Senior': ['senior-and-up'],
            'Officer': [],
            'Viewer': ['admin-supervisor-only', 'senior-and-up']
        };
        // Hide all role-based elements first
        document.querySelectorAll('.admin-only, .admin-supervisor-only, .senior-and-up, .delete-permission, .plan-work-permission').forEach(el => el.style.display = 'none');
        
        // Show elements based on the current user's role
        if (roles[role]) {
            roles[role].forEach(className => {
                document.querySelectorAll(`.${className}`).forEach(el => el.style.display = 'block'); // Or 'inline-block', 'flex' etc. as needed
            });
        }
         // Special handling for planning permission
        if (role !== 'Officer' && role !== 'Viewer') {
             document.querySelectorAll('.plan-work-permission').forEach(el => el.style.display = 'block');
        }
        
        // Handle delete permissions specifically for senior and viewer roles
        if (role === 'Senior' || role === 'Viewer') {
            document.querySelectorAll('.delete-permission').forEach(el => el.style.display = 'none');
        }
        
        // For Viewer role, hide all edit buttons
        if (role === 'Viewer') {
            document.querySelectorAll('.edit-button').forEach(el => el.style.display = 'none');
        }
    }
    
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                currentUserProfile = userDoc.data();
            } else {
                // If user doc doesn't exist (e.g., new registration race condition), create a temporary one.
                currentUserProfile = {
                    email: user.email,
                    firstName: "ผู้ใช้",
                    lastName: "ใหม่",
                    role: 'Officer', // Default role
                    smallStars: 0,
                    bigStars: 0
                };
            }
            isAdmin = user.email === 'admin@admin.com';
            if (isAdmin && currentUserProfile.role !== 'Admin') { // Assign Admin role if not set
                currentUserProfile.role = 'Admin';
                await setDoc(userDocRef, { role: 'Admin' }, { merge: true });
            }
            
            // Initialize star points if not exists
            if (currentUserProfile.smallStars === undefined) {
                currentUserProfile.smallStars = 0;
                await setDoc(userDocRef, { smallStars: 0 }, { merge: true });
            }
            if (currentUserProfile.bigStars === undefined) {
                currentUserProfile.bigStars = 0;
                await setDoc(userDocRef, { bigStars: 0 }, { merge: true });
            }
            
            updateUserDisplays(currentUserProfile);
            updateUIForRoles();
            setupFirestoreListeners();
            showMainView(views.mainMenu);
        } else {
            detachFirestoreListeners();
            currentUserProfile = null;
            showMainView(views.loginRegister);
            showAuthForm('login');
        }
    });
    
    function detachFirestoreListeners() {
        if (unsubscribeTransfers) unsubscribeTransfers();
        if (unsubscribeIssues) unsubscribeIssues();
        if (unsubscribeUsers) unsubscribeUsers();
        if (unsubscribeScores) unsubscribeScores();
        if (unsubscribeStarPoints) unsubscribeStarPoints();
    }
    
    function setupFirestoreListeners() {
        if (!currentUser) return;
        detachFirestoreListeners();
        const transfersQuery = query(collection(db, "transfers"));
        unsubscribeTransfers = onSnapshot(transfersQuery, (snapshot) => {
            const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allTransfersData = allData.filter(d => !d.isCompleted);
            completedTransfersData = allData.filter(d => d.isCompleted);
            updateMainMenuSummary();
            // Conditional UI updates
            if (views.transfers && views.transfers.style.display === 'block') {
                if (detailsView.style.display === 'block') renderDetailsTable();
                if (completedView.style.display === 'block') renderCompletedView();
                if (issuesView.style.display === 'block') renderIssuesView();
                if (checkView.style.display === 'block' && currentTforData) {
                    const updatedData = allData.find(t => t.id === currentTforData.id);
                    if(updatedData) {
                        currentTforData = updatedData;
                        renderCheckView();
                    }
                }
            }
            if (views.checkProduct && views.checkProduct.style.display === 'block') {
                renderCheckProductView();
            }
            if (views.statistics && views.statistics.style.display === 'block') renderAdvancedStatistics();
            if (views.todaysPlan && views.todaysPlan.style.display === 'block') renderTodaysPlanView();
            if (views.kpi && views.kpi.style.display === 'block') renderKpiView();
            if (views.profile && views.profile.style.display === 'block') renderRecentActivity();
        }, (error) => console.error("Transfers listener error:", error));
        
        const issuesQuery = query(collection(db, "issues"));
        unsubscribeIssues = onSnapshot(issuesQuery, (snapshot) => {
            const newIssuesData = {};
            snapshot.forEach(doc => {
                const issue = { id: doc.id, ...doc.data() };
                (issue.issueTypes || ['อื่นๆ']).forEach(type => {
                    if (!newIssuesData[type]) newIssuesData[type] = [];
                    newIssuesData[type].push(issue);
                });
            });
            issuesData = newIssuesData;
            updateMainMenuSummary();
            if (views.transfers && views.transfers.style.display === 'block' && issuesView.style.display === 'block') renderIssuesView();
            if (views.kpi && views.kpi.style.display === 'block') renderKpiView();
            if (views.profile && views.profile.style.display === 'block') renderRecentActivity();
        }, (error) => console.error("Issues listener error:", error));
        
        const userRole = currentUserProfile?.role;
        if (userRole === 'Admin' || userRole === 'Supervisor') {
            const usersQuery = query(collection(db, "users"));
            unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
                allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (views.kpi && views.kpi.style.display === 'block') renderKpiView();
            });
            
            const scoresQuery = query(collection(db, "scores"));
            unsubscribeScores = onSnapshot(scoresQuery, (snapshot) => {
                allScores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                 if (views.kpi && views.kpi.style.display === 'block' && document.getElementById('kpi-details-container').style.display !== 'none') {
                    const activeUserId = document.getElementById('kpi-details-container').dataset.userId;
                    if (activeUserId) {
                        const activeUser = allUsers.find(u => u.id === activeUserId);
                        if (activeUser) renderKpiDetails(activeUser);
                    }
                }
                if (views.profile && views.profile.style.display === 'block') renderProfileView();
            });
            
            const starPointsQuery = query(collection(db, "starPoints"));
            unsubscribeStarPoints = onSnapshot(starPointsQuery, (snapshot) => {
                allStarPoints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (views.profile && views.profile.style.display === 'block') renderProfileStarPoints();
            });
        }
    }
    
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Show loading spinner during login
        const loadingContainer = document.getElementById('loading-container');
        loadingContainer.style.display = 'flex';
        
        signInWithEmailAndPassword(auth, loginForm['login-email'].value, loginForm['login-password'].value)
            .then(() => {
                showNotification('เข้าสู่ระบบสำเร็จ!');
                // Hide loading spinner after successful login
                loadingContainer.style.display = 'none';
            })
            .catch((error) => {
                showNotification(`เข้าสู่ระบบไม่สำเร็จ: ${error.message}`, false);
                // Hide loading spinner after failed login
                loadingContainer.style.display = 'none';
            });
    });
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Show loading spinner during registration
        const loadingContainer = document.getElementById('loading-container');
        loadingContainer.style.display = 'flex';
        
        const email = registerForm['register-email'].value;
        const password = registerForm['register-password'].value;
        const firstName = registerForm['register-firstname'].value;
        const lastName = registerForm['register-lastname'].value;
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await setDoc(doc(db, "users", user.uid), {
                firstName,
                lastName,
                email,
                role: 'Officer', // Default role
                smallStars: 0,
                bigStars: 0
            });
            showNotification('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
            showAuthForm('login');
            // Hide loading spinner after successful registration
            loadingContainer.style.display = 'none';
        } catch (error) {
            showNotification(`สมัครสมาชิกไม่สำเร็จ: ${error.message}`, false);
            // Hide loading spinner after failed registration
            loadingContainer.style.display = 'none';
        }
    });
    
    logoutButtonMain.addEventListener('click', () => signOut(auth));
    
    document.getElementById('go-to-transfers').addEventListener('click', () => showMainView(views.transfers));
    document.getElementById('go-to-check-product').addEventListener('click', () => {
        renderCheckProductView();
        showMainView(views.checkProduct);
    });
    document.getElementById('go-to-ai-chat').addEventListener('click', () => showMainView(views.aiChat));
    document.getElementById('go-to-calendar').addEventListener('click', () => {
        renderCalendar(new Date());
        showMainView(views.calendar);
    });
    document.getElementById('go-to-statistics').addEventListener('click', () => {
        renderAdvancedStatistics();
        showMainView(views.statistics);
    });
    document.getElementById('go-to-kpi').addEventListener('click', () => {
        renderKpiView();
        showMainView(views.kpi);
    });
    document.getElementById('profile-button').addEventListener('click', () => {
        renderProfileView();
        showMainView(views.profile);
    });
    
    document.querySelectorAll('.toggle-password').forEach(el => {
        el.addEventListener('click', (e) => {
            const input = e.target.closest('.password-container').querySelector('input');
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            e.target.textContent = type === 'password' ? '👁️' : ' ';
        });
    });
    
    function updateMainMenuSummary() {
        const todayString = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        const pendingCount = allTransfersData.filter(t => !t.scheduledDate).length;
        const todaysPlanCount = allTransfersData.filter(t => t.scheduledDate === todayString).length;
        const completedTodayCount = completedTransfersData.filter(t => t.completionDate === todayString).length;
        
        // แสดงรายการมีปัญหาเฉพาะภายในวันนั้นๆ
        const todayIssues = Object.values(issuesData)
            .flat()
            .filter(issue => issue.reportDate === todayString);
        const issuesCount = todayIssues.length;
        
        document.getElementById('summary-todays-plan').textContent = todaysPlanCount;
        document.getElementById('summary-pending').textContent = pendingCount;
        document.getElementById('summary-completed-today').textContent = completedTodayCount;
        document.getElementById('summary-issues').textContent = issuesCount;
    }
    
    function showSubView(viewToShow) {
        [transfersMenuView, formView, detailsView, issuesView, completedView, checkView].forEach(v => v.classList.add('hidden'));
        viewToShow.classList.remove('hidden');
        window.scrollTo(0, 0);
    }
    
    function initializeForm() {
        inboundForm.reset();
        document.getElementById('delivery-date').value = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('image-preview').innerHTML = '';
        uploadedImagesBase64 = [];
        document.getElementById('tfor-container').innerHTML = '';
        addTforBlock();
    }
    
    document.getElementById('summary-todays-plan-card').addEventListener('click', () => {
        renderTodaysPlanView();
        showMainView(views.todaysPlan);
    });
    document.getElementById('summary-pending-card').addEventListener('click', () => {
        showMainView(views.transfers);
        renderDetailsTable();
        showSubView(detailsView);
    });
    document.getElementById('summary-completed-today-card').addEventListener('click', () => {
        showMainView(views.transfers);
        renderCompletedView();
        showSubView(completedView);
    });
    document.getElementById('summary-issues-card').addEventListener('click', () => {
        showMainView(views.transfers);
        renderIssuesView();
        showSubView(issuesView);
    });
    
    document.querySelectorAll('.back-to-main-menu').forEach(btn => btn.addEventListener('click', () => {
        updateMainMenuSummary();
        showMainView(views.mainMenu);
    }));
    document.querySelectorAll('.back-to-transfers-menu').forEach(btn => btn.addEventListener('click', () => showSubView(transfersMenuView)));
    
    document.getElementById('menu-1').addEventListener('click', () => { initializeForm(); showSubView(formView); });
    document.getElementById('menu-2').addEventListener('click', () => { renderDetailsTable(); showSubView(detailsView); });
    document.getElementById('menu-3').addEventListener('click', () => { renderCompletedView(); showSubView(completedView); });
    document.getElementById('menu-4').addEventListener('click', () => { renderIssuesView(); showSubView(issuesView); });
    backToPreviousViewButton.addEventListener('click', () => showSubView(previousView || detailsView));
    
    document.getElementById('lp-front').addEventListener('input', (e) => { if (e.target.value.length >= 4) document.getElementById('lp-back').focus(); });
    
    async function resizeImage(file, maxWidth = 1280, maxHeight = 720, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    }
    
    const fileInput = document.getElementById('file-input');
    const dragDropArea = document.getElementById('drag-drop-area');
    dragDropArea.addEventListener('click', () => fileInput.click());
    dragDropArea.addEventListener('dragover', (e) => { e.preventDefault(); dragDropArea.classList.add('bg-indigo-50'); });
    dragDropArea.addEventListener('dragleave', () => dragDropArea.classList.remove('bg-indigo-50'));
    dragDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dragDropArea.classList.remove('bg-indigo-50');
        handleFiles(e.dataTransfer.files, document.getElementById('image-preview'), uploadedImagesBase64);
    });
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files, document.getElementById('image-preview'), uploadedImagesBase64));
    
    async function handleFiles(files, previewContainer, imageArray) {
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                 try {
                    const resizedBase64 = await resizeImage(file);
                    imageArray.push(resizedBase64);
                    
                    const div = document.createElement('div');
                    div.className = 'relative group h-32 overflow-hidden rounded-lg shadow-md';
                    div.innerHTML = `<img src="${resizedBase64}" class="w-full h-full object-cover">
                    <button type="button" class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>`;
                    previewContainer.appendChild(div);
                    div.querySelector('button').addEventListener('click', () => {
                        const index = imageArray.indexOf(resizedBase64);
                        if (index > -1) {
                            imageArray.splice(index, 1);
                        }
                        div.remove();
                    });
                } catch (error) {
                    console.error("Image resizing failed:", error);
                    showNotification("เกิดข้อผิดพลาดในการปรับขนาดรูปภาพ", false);
                }
            }
        }
    }
    
    const branches = ['WH.40 (NDC)', 'WH.61 Chiangmai', 'WH.62 Suratthani', 'WH.63 Nakhon Ratchasima', 'WH.64 Leamchabang', 'WH.65 Udon Thani', 'WH.66 Phitsanulok', 'WH.67 Ratchaburi', 'WH.68 Hat Yai'];
    
    function addTforBlock() {
        const year = new Date().getFullYear().toString().substr(-2);
        const tforBlock = document.createElement('div');
        tforBlock.className = 'tfor-block border-2 border-gray-200 rounded-xl p-6 bg-white shadow-inner relative';
        tforBlock.innerHTML = `
            <button type="button" class="remove-tfor-button absolute top-4 right-4 text-red-500 hover:text-red-700 font-bold text-xl">&times;</button>
            <div class="mb-4 bg-gray-100 rounded-lg p-4 flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
                <label class="inline-flex items-center"><input type="checkbox" class="tfor-no-tfor-check form-checkbox h-5 w-5 text-fuchsia-600 rounded"><span class="ml-2 text-gray-700 font-semibold">สินค้าไม่ติดเลข TFOR</span></label>
                <label class="inline-flex items-center"><input type="checkbox" class="tfor-no-label-check form-checkbox h-5 w-5 text-fuchsia-600 rounded"><span class="ml-2 text-gray-700 font-semibold">ไม่มีป้าย</span></label>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 font-semibold mb-2">หมายเลข TFOR</label>
                <div class="flex items-center">
                    <span class="bg-gray-200 text-gray-600 px-4 py-2 rounded-l-lg font-mono">TFOR${year}000</span>
                    <input type="text" maxlength="4" placeholder="1234" class="w-24 rounded-r-lg border-gray-300 shadow-sm">
                </div>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 font-semibold mb-2">TFOR ที่พ่วงมา (ถ้ามี)</label>
                <div class="flex items-center">
                    <span class="bg-gray-200 text-gray-600 px-4 py-2 rounded-l-lg font-mono">TFOR${year}000</span>
                    <input type="text" maxlength="4" placeholder="5678" class="linked-tfor-input w-24 border-gray-300 shadow-sm">
                    <button type="button" class="add-linked-tfor-btn ml-2 px-3 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600">+</button>
                </div>
                <div class="linked-tfor-list mt-2 space-y-1"></div>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 font-semibold mb-2">สาขาต้นทาง</label>
                <select class="w-full rounded-lg border-gray-300 shadow-sm">
                    <option value="">เลือกสาขา</option>
                    ${branches.map(branch => `<option value="${branch}">${branch}</option>`).join('')}
                </select>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 font-semibold mb-2">เลือกหมายเลขพาเลท</label>
                <div class="flex flex-wrap gap-2">${Array.from({ length: 20 }, (_, i) => `<button type="button" class="pallet-button px-4 py-2 text-sm rounded-full bg-gray-200" data-value="${i + 1}">${i + 1}</button>`).join('')}</div>
                <input type="hidden" class="pallet-count-input">
                <div class="mt-2 text-sm text-gray-600 font-semibold pallet-status">ยังไม่ได้เลือกพาเลท</div>
            </div>
            <div class="mb-4">
                <label class="block text-gray-700 font-semibold mb-2">หมายเหตุพาเลท (ถ้ามี)</label>
                <textarea rows="3" class="w-full rounded-lg border-gray-300 shadow-sm pallet-notes"></textarea>
            </div>
        `;
        document.getElementById('tfor-container').appendChild(tforBlock);
        addTforBlockListeners(tforBlock);
    }
    
    document.getElementById('add-tfor-button').addEventListener('click', addTforBlock);
    
    function addTforBlockListeners(tforBlock) {
        tforBlock.querySelectorAll('.pallet-button').forEach(button => {
            button.addEventListener('click', () => {
                button.classList.toggle('bg-fuchsia-600');
                button.classList.toggle('text-white');
                button.classList.toggle('bg-gray-200');
                const selectedValues = Array.from(tforBlock.querySelectorAll('.pallet-button.bg-fuchsia-600')).map(b => b.dataset.value).sort((a,b) => parseInt(a) - parseInt(b));
                tforBlock.querySelector('.pallet-count-input').value = selectedValues.join(',');
                tforBlock.querySelector('.pallet-status').textContent = selectedValues.length > 0 ? `คุณเลือกพาเลทที่ ${selectedValues.join(', ')}` : `ยังไม่ได้เลือกพาเลท`;
            });
        });
        tforBlock.querySelector('.remove-tfor-button').addEventListener('click', () => tforBlock.remove());

        // Listeners for Linked TFORs
        const addBtn = tforBlock.querySelector('.add-linked-tfor-btn');
        const input = tforBlock.querySelector('.linked-tfor-input');
        const list = tforBlock.querySelector('.linked-tfor-list');
        const year = new Date().getFullYear().toString().substr(-2);

        addBtn.addEventListener('click', () => {
            const tforValue = input.value.trim();
            if (tforValue && /^\d{4}$/.test(tforValue)) {
                const fullTfor = `TFOR${year}000${tforValue}`;
                const listItem = document.createElement('div');
                listItem.className = 'flex items-center justify-between bg-gray-100 p-1 rounded';
                listItem.innerHTML = `
                    <span class="text-sm font-mono">${fullTfor}</span>
                    <button type="button" class="remove-linked-tfor text-red-500 font-bold px-2">&times;</button>
                `;
                list.appendChild(listItem);
                listItem.querySelector('.remove-linked-tfor').addEventListener('click', () => {
                    listItem.remove();
                });
                input.value = '';
                input.focus();
            } else {
                showNotification('กรุณากรอกเลข TFOR 4 หลัก', false);
            }
        });
    }
    
    inboundForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // --- FORM VALIDATION ---
        if (document.getElementById('lp-front').value.trim() === '' || document.getElementById('lp-back').value.trim() === '') {
            showNotification('กรุณากรอกทะเบียนรถให้ครบถ้วน', false); return;
        }
        if (uploadedImagesBase64.length === 0) {
            showNotification('กรุณาอัปโหลดรูปภาพรวมบนรถอย่างน้อย 1 รูป', false); return;
        }
        const tforBlocks = document.querySelectorAll('.tfor-block');
        if (tforBlocks.length === 0) {
            showNotification('กรุณาเพิ่มรายละเอียด TFOR อย่างน้อย 1 รายการ', false); return;
        }
        let isFormValid = true;
        tforBlocks.forEach(block => {
            const tforNum = block.querySelector('input[type="text"][maxlength="4"]').value.trim();
            const branch = block.querySelector('select').value;
            const pallets = block.querySelector('.pallet-count-input').value;
            if (!tforNum || !branch || !pallets) {
                isFormValid = false;
            }
        });
        if (!isFormValid) {
            showNotification('กรุณากรอกข้อมูล TFOR, สาขา, และเลือกพาเลทให้ครบทุกรายการ', false); return;
        }
        // --- END VALIDATION ---
        
        saveButton.innerHTML = `<div class="loading-spinner w-5 h-5 border-white border-t-transparent rounded-full mr-2"></div> กำลังบันทึก...`;
        saveButton.disabled = true;
        
        try {
            const deliveryDate = document.getElementById('delivery-date').value;
            const licensePlate = `${document.getElementById('lp-front').value.trim()} ${document.getElementById('lp-back').value.trim()}`;
            
            const batch = writeBatch(db);
            for (const block of tforBlocks) {
                const palletNumbers = block.querySelector('.pallet-count-input').value.split(',').filter(Boolean);
                const palletNotes = block.querySelector('.pallet-notes').value;
                const linkedTforElements = block.querySelectorAll('.linked-tfor-list span');
                const linkedTfors = Array.from(linkedTforElements).map(span => span.textContent);

                const tforData = {
                    deliveryDate, licensePlate,
                    images: uploadedImagesBase64,
                    isNoTFOR: block.querySelector('.tfor-no-tfor-check').checked,
                    isNoLabel: block.querySelector('.tfor-no-label-check').checked,
                    tforNumber: block.querySelector('input[type="text"][maxlength="4"]').value.trim(),
                    branch: block.querySelector('select').value,
                    palletNumbers,
                    palletCount: palletNumbers.length,
                    palletNotes: palletNotes,
                    linkedTfors: linkedTfors,
                    checkedPallets: [],
                    receivedPallets: [],
                    isCompleted: false,
                    isReceived: false,
                    createdAt: serverTimestamp(),
                    createdByUid: currentUser.uid,
                    createdByName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`
                };
                const newTransferRef = doc(collection(db, "transfers"));
                batch.set(newTransferRef, tforData);
                if (tforData.isNoTFOR || tforData.isNoLabel) {
                    const issueTypes = [];
                    if (tforData.isNoTFOR) issueTypes.push('สินค้าไม่ติดเลข TFOR');
                    if (tforData.isNoLabel) issueTypes.push('ไม่มีป้าย');
                    const issue = {
                        ...tforData,
                        transferId: newTransferRef.id,
                        issueTypes,
                        issueNotes: "สร้างจากหน้าฟอร์มหลัก",
                        issueImages: uploadedImagesBase64,
                        reportDate: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
                        reportedByUid: currentUser.uid,
                        reportedByName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`,
                        checkerUid: currentUser.uid,
                        checkerName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`
                    };
                    batch.set(doc(collection(db, "issues")), issue);
                }
            }
            await batch.commit();
            showNotification('บันทึกข้อมูลสำเร็จแล้ว!');
            showSubView(detailsView);
        } catch (error) {
            console.error("Error saving data: ", error);
            showNotification('เกิดข้อผิดพลาดในการบันทึก', false);
        } finally {
            saveButton.innerHTML = `บันทึกข้อมูล`;
            saveButton.disabled = false;
        }
    });
    
    async function handlePalletCheck(palletNum, buttonElement) {
        const isCurrentlyChecked = currentTforData.checkedPallets?.includes(palletNum);
        if (buttonElement) {
            buttonElement.classList.toggle('bg-green-500', !isCurrentlyChecked);
            buttonElement.classList.toggle('text-white', !isCurrentlyChecked);
            buttonElement.classList.toggle('bg-gray-200', isCurrentlyChecked);
        }
        const checkedPallets = [...(currentTforData.checkedPallets || [])];
        const index = checkedPallets.indexOf(palletNum);
        if (index > -1) checkedPallets.splice(index, 1);
        else checkedPallets.push(palletNum);
        currentTforData.checkedPallets = checkedPallets; 
        const transferDocRef = doc(db, "transfers", currentTforData.id);
        const isNowCompleted = checkedPallets.length === currentTforData.palletNumbers.length;
        const checkLog = currentTforData.checkLog || [];
        checkLog.push({ pallet: palletNum, user: currentUserProfile.firstName, timestamp: new Date().toISOString() });
        try {
            await updateDoc(transferDocRef, {
                isCompleted: isNowCompleted,
                completionDate: isNowCompleted ? new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : null,
                checkedPallets: checkedPallets,
                lastCheckedByUid: currentUser.uid,
                lastCheckedByName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`,
                checkLog: checkLog
            });
            
            // Log the action
            await logAction('เช็คพาเลท', {
                transferId: currentTforData.id,
                palletNumber: palletNum,
                user: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`
            });
            
            if (isNowCompleted) {
                showNotification('เช็คสินค้าครบถ้วนแล้ว!');
            }
        } catch (error) {
            console.error("Error updating pallet check status: ", error);
            showNotification('เกิดข้อผิดพลาดในการอัปเดต', false);
        }
    }
    
    async function handlePalletReceive(palletNum, buttonElement) {
        const isCurrentlyReceived = currentTforData.receivedPallets?.includes(palletNum);
        if (buttonElement) {
            buttonElement.classList.toggle('bg-purple-500', !isCurrentlyReceived);
            buttonElement.classList.toggle('text-white', !isCurrentlyReceived);
            buttonElement.classList.toggle('bg-gray-200', isCurrentlyReceived);
        }
        const receivedPallets = [...(currentTforData.receivedPallets || [])];
        const index = receivedPallets.indexOf(palletNum);
        if (index > -1) receivedPallets.splice(index, 1);
        else receivedPallets.push(palletNum);
        currentTforData.receivedPallets = receivedPallets;
        
        const transferDocRef = doc(db, "transfers", currentTforData.id);
        const isAllReceived = receivedPallets.length === currentTforData.palletNumbers.length;
        const receiveLog = currentTforData.receiveLog || [];
        receiveLog.push({ pallet: palletNum, user: currentUserProfile.firstName, timestamp: new Date().toISOString() });
        
        try {
            await updateDoc(transferDocRef, {
                isReceived: isAllReceived,
                receivedDate: isAllReceived ? new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : null,
                receivedPallets: receivedPallets,
                lastReceivedByUid: currentUser.uid,
                lastReceivedByName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`,
                receiveLog: receiveLog
            });
            
            // Log the action
            await logAction('รับสินค้า', {
                transferId: currentTforData.id,
                palletNumber: palletNum,
                user: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`
            });
            
            if (isAllReceived) {
                showNotification('รับสินค้าครบถ้วนแล้ว!');
            }
        } catch (error) {
            console.error("Error updating pallet receive status: ", error);
            showNotification('เกิดข้อผิดพลาดในการอัปเดต', false);
        }
    }
    
    async function handleReceiveAll() {
        if (!currentTforData.checkedPallets || currentTforData.checkedPallets.length === 0) {
            showNotification('กรุณาเช็คสินค้าก่อนรับ', false);
            return;
        }
        
        const receivedPallets = [...currentTforData.checkedPallets];
        currentTforData.receivedPallets = receivedPallets;
        
        const transferDocRef = doc(db, "transfers", currentTforData.id);
        const receiveLog = currentTforData.receiveLog || [];
        receivedPallets.forEach(palletNum => {
            receiveLog.push({ pallet: palletNum, user: currentUserProfile.firstName, timestamp: new Date().toISOString() });
        });
        
        try {
            await updateDoc(transferDocRef, {
                isReceived: true,
                receivedDate: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
                receivedPallets: receivedPallets,
                lastReceivedByUid: currentUser.uid,
                lastReceivedByName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`,
                receiveLog: receiveLog
            });
            
            // Log the action
            await logAction('รับสินค้าทั้งหมด', {
                transferId: currentTforData.id,
                user: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`
            });
            
            showNotification('รับสินค้าครบถ้วนแล้ว!');
        } catch (error) {
            console.error("Error updating receive status: ", error);
            showNotification('เกิดข้อผิดพลาดในการอัปเดต', false);
        }
    }
    
    async function savePalletIssues(palletNum, formWrapper) {
        try {
            const batch = writeBatch(db);
            for (const itemForm of formWrapper.querySelectorAll('.issue-item-form')) {
                const issueTypes = Array.from(itemForm.querySelectorAll('.issue-type-cb:checked')).map(cb => cb.value);
                if (itemForm.querySelector('.issue-type-cb-other:checked')) {
                    issueTypes.push(itemForm.querySelector('.issue-other-details').value || 'อื่นๆ');
                }
                const imagesForThisItem = itemForm.issueImages || []; // Retrieve stored images
                const newIssue = {
                    ...currentTforData,
                    transferId: currentTforData.id,
                    palletNumber: palletNum,
                    itemNumber: itemForm.querySelector('.issue-item-number').value,
                    quantity: itemForm.querySelector('.issue-quantity').value,
                    issueTypes: issueTypes.length > 0 ? issueTypes : ['อื่นๆ'],
                    issueNotes: itemForm.querySelector('.issue-other-details').value,
                    issueImages: imagesForThisItem,
                    reportDate: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
                    reportedByUid: currentUser.uid,
                    reportedByName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`,
                    checkerUid: currentTforData.lastCheckedByUid || null,
                    checkerName: currentTforData.lastCheckedByName || null
                };
                delete newIssue.id;
                batch.set(doc(collection(db, "issues")), newIssue);
            }
            await batch.commit();
            
            // Log the action
            await logAction('รายงานปัญหา', {
                transferId: currentTforData.id,
                palletNumber: palletNum,
                user: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`
            });
            
            showNotification(`บันทึกปัญหาสำหรับพาเลทที่ ${palletNum} เรียบร้อยแล้ว!`);
            formWrapper.remove();
            document.querySelectorAll('.issue-pallet-button').forEach(btn => btn.classList.remove('active'));
        } catch (error) {
            console.error("Error saving issue: ", error);
            showNotification('เกิดข้อผิดพลาดในการบันทึกปัญหา', false);
        }
    }
    
    async function deleteTransfer(transferId) {
        showConfirmationModal("คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้และปัญหาที่เกี่ยวข้องทั้งหมด?", async () => {
            try {
                const batch = writeBatch(db);
                batch.delete(doc(db, "transfers", transferId));
                const issuesSnapshot = await getDocs(query(collection(db, "issues"), where("transferId", "==", transferId)));
                issuesSnapshot.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                
                // Log the action
                await logAction('ลบรายการ TFOR', {
                    transferId: transferId,
                    user: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`
                });
                
                showNotification("ลบรายการสำเร็จ");
            } catch (error) {
                console.error("Error deleting transfer:", error);
                showNotification("เกิดข้อผิดพลาดในการลบ", false);
            }
        });
    }
    
    async function deleteIssue(issueId) {
        showConfirmationModal("คุณแน่ใจหรือไม่ว่าต้องการลบปัญหานี้?", async () => {
            try {
                await deleteDoc(doc(db, "issues", issueId));
                
                // Log the action
                await logAction('ลบปัญหา', {
                    issueId: issueId,
                    user: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`
                });
                
                showNotification("ลบปัญหาสำเร็จ");
            } catch (error) {
                console.error("Error deleting issue:", error);
                showNotification("เกิดข้อผิดพลาดในการลบ", false);
            }
        });
    }
    
    function renderDetailsTable(filter = '', sortBy = 'date-desc') {
        const container = document.getElementById('details-table-container');
        let filteredData = allTransfersData.filter(d => !d.scheduledDate && !d.isReceived);
        if (filter) {
            const lowerCaseFilter = filter.toLowerCase();
            filteredData = filteredData.filter(d => 
                (d.tforNumber || '').endsWith(filter) || 
                (d.licensePlate || '').toLowerCase().includes(lowerCaseFilter) ||
                (d.branch || '').toLowerCase().includes(lowerCaseFilter) ||
                (d.linkedTfors && d.linkedTfors.some(lt => lt.toLowerCase().includes(lowerCaseFilter)))
            );
        }
        if (sortBy === 'date-desc') filteredData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        else if (sortBy === 'date-asc') filteredData.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
        else if (sortBy === 'branch-asc') filteredData.sort((a, b) => (a.branch || '').localeCompare(b.branch || ''));
        container.innerHTML = filteredData.length === 0 ? `<p class="text-gray-500 text-center">ไม่พบข้อมูล</p>` : '';
        if(filteredData.length === 0) return;
        const table = document.createElement('table');
        table.className = 'min-w-full bg-white rounded-lg shadow';
        table.innerHTML = `
            <thead class="bg-gray-200"><tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">TFOR</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">สาขาต้นทาง</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ทะเบียนรถ</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">จำนวนพาเลท</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">หมายเหตุ</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase delete-permission">จัดการ</th>
            </tr></thead>
            <tbody class="bg-white divide-y divide-gray-200"></tbody>`;
        const tbody = table.querySelector('tbody');
        filteredData.forEach(data => {
            let statusText = 'ยังไม่เช็ค';
            let statusColor = 'bg-gray-100 text-gray-800';
            
            // New status for "รอรับสินค้า" (waiting for product receipt)
            if (data.checkedPallets && data.checkedPallets.length > 0 && !data.isReceived) {
                statusText = 'รอรับสินค้า';
                statusColor = 'bg-blue-100 text-blue-800';
            } else if (data.receivedPallets && data.receivedPallets.length > 0) {
                statusText = 'รับแล้ว';
                statusColor = 'bg-purple-100 text-purple-800';
            } else if (data.checkedPallets && data.checkedPallets.length > 0) {
                statusText = 'กำลังเช็ค';
                statusColor = 'bg-yellow-100 text-yellow-800';
            }
            
            const row = tbody.insertRow();
            row.className = 'hover:bg-gray-50 cursor-pointer';
            row.innerHTML = `
                <td class="px-6 py-4"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}">${statusText}</span></td>
                <td class="px-6 py-4 text-sm">${formatDateAbbreviated(data.deliveryDate)}</td>
                <td class="px-6 py-4 text-sm">...${data.tforNumber}</td>
                <td class="px-6 py-4 text-sm">${data.branch}</td>
                <td class="px-6 py-4 text-sm">${data.licensePlate}</td>
                <td class="px-6 py-4 text-sm">${data.palletCount}</td>
                <td class="px-6 py-4 text-sm">${data.palletNotes || '-'}</td>
                <td class="px-6 py-4 text-sm flex items-center space-x-2 delete-permission"></td>`;
            row.addEventListener('click', () => {
                currentTforData = data;
                renderCheckView();
                showSubView(checkView);
            });
            
            const adminCell = row.cells[7];
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;
            deleteButton.className = 'text-red-500 hover:text-red-700';
            deleteButton.onclick = (e) => { e.stopPropagation(); deleteTransfer(data.id); };
            adminCell.appendChild(deleteButton);
        });
        updateUIForRoles();
        container.appendChild(table);
    }
    
    detailsModal.addEventListener('showDetails', (e) => showDetailsModal(e.detail.item));
    
    document.getElementById('details-search').addEventListener('input', (e) => renderDetailsTable(e.target.value, document.getElementById('details-sort').value));
    document.getElementById('details-sort').addEventListener('change', (e) => renderDetailsTable(document.getElementById('details-search').value, e.target.value));
    
    // เพิ่มปุ่มวางแผนงานในหน้ารายละเอียด TRANSFERS
    document.getElementById('plan-work-btn')?.addEventListener('click', () => {
        if (!currentTforData) {
            // ถ้าไม่มีข้อมูล TFOR ที่เลือก ให้แสดงปฏิทินเพื่อเลือกวันที่วางแผน
            showCalendarPicker();
        } else {
            // ถ้ามีข้อมูล TFOR ที่เลือก ให้แสดง modal สำหรับวางแผน
            showSchedulingModalForTransfer(currentTforData);
        }
    });
    
    function showCalendarPicker() {
        // สร้างปฏิทินสำหรับเลือกวันที่วางแผน
        const calendarPicker = document.createElement('div');
        calendarPicker.className = 'calendar-picker';
        
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        // สร้าง header ของปฏิทิน
        const header = document.createElement('div');
        header.className = 'calendar-picker-header';
        header.innerHTML = `
            <button id="prev-month" class="px-2 py-1 rounded hover:bg-gray-200">&lt;</button>
            <h3>${thaiMonths[currentMonth]} ${currentYear + 543}</h3>
            <button id="next-month" class="px-2 py-1 rounded hover:bg-gray-200">&gt;</button>
        `;
        
        // สร้าง grid สำหรับวันที่
        const grid = document.createElement('div');
        grid.className = 'calendar-picker-grid';
        
        // สร้างชื่อวัน
        const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
        dayNames.forEach(day => {
            const dayName = document.createElement('div');
            dayName.className = 'text-center text-sm font-semibold';
            dayName.textContent = day;
            grid.appendChild(dayName);
        });
        
        // สร้างวันที่ในเดือน
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        // เพิ่มวันที่ว่างก่อนวันแรกของเดือน
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            grid.appendChild(emptyDay);
        }
        
        // เพิ่มวันที่ในเดือน
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-picker-day';
            dayElement.textContent = day;
            
            // เพิ่มคลาสสำหรับวันนี้
            if (currentYear === today.getFullYear() && currentMonth === today.getMonth() && day === today.getDate()) {
                dayElement.classList.add('today');
            }
            
            // เพิ่ม event listener สำหรับการเลือกวันที่
            dayElement.addEventListener('click', () => {
                const selectedDate = new Date(currentYear, currentMonth, day);
                const dateString = selectedDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
                
                // ปิดปฏิทินและแสดง modal สำหรับเลือก TFOR ที่จะวางแผน
                calendarPicker.remove();
                showSchedulingModal(dateString);
            });
            
            grid.appendChild(dayElement);
        }
        
        calendarPicker.appendChild(header);
        calendarPicker.appendChild(grid);
        
        // เพิ่มปฏิทินเข้าไปในหน้า
        document.body.appendChild(calendarPicker);
        
        // เพิ่ม event listener สำหรับปุ่มเปลี่ยนเดือน
        header.querySelector('#prev-month').addEventListener('click', () => {
            calendarPicker.remove();
            showCalendarPickerForMonth(currentMonth - 1, currentYear);
        });
        
        header.querySelector('#next-month').addEventListener('click', () => {
            calendarPicker.remove();
            showCalendarPickerForMonth(currentMonth + 1, currentYear);
        });
        
        // เพิ่ม event listener สำหรับการคลิกนอกปฏิทินเพื่อปิด
        document.addEventListener('click', function closeCalendar(e) {
            if (!calendarPicker.contains(e.target) && e.target !== document.getElementById('plan-work-btn')) {
                calendarPicker.remove();
                document.removeEventListener('click', closeCalendar);
            }
        });
    }
    
    function showCalendarPickerForMonth(month, year) {
        // สร้างปฏิทินสำหรับเดือนและปีที่ระบุ
        const calendarPicker = document.createElement('div');
        calendarPicker.className = 'calendar-picker';
        
        const today = new Date();
        
        // สร้าง header ของปฏิทิน
        const header = document.createElement('div');
        header.className = 'calendar-picker-header';
        header.innerHTML = `
            <button id="prev-month" class="px-2 py-1 rounded hover:bg-gray-200">&lt;</button>
            <h3>${thaiMonths[month]} ${year + 543}</h3>
            <button id="next-month" class="px-2 py-1 rounded hover:bg-gray-200">&gt;</button>
        `;
        
        // สร้าง grid สำหรับวันที่
        const grid = document.createElement('div');
        grid.className = 'calendar-picker-grid';
        
        // สร้างชื่อวัน
        const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
        dayNames.forEach(day => {
            const dayName = document.createElement('div');
            dayName.className = 'text-center text-sm font-semibold';
            dayName.textContent = day;
            grid.appendChild(dayName);
        });
        
        // สร้างวันที่ในเดือน
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // เพิ่มวันที่ว่างก่อนวันแรกของเดือน
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            grid.appendChild(emptyDay);
        }
        
        // เพิ่มวันที่ในเดือน
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-picker-day';
            dayElement.textContent = day;
            
            // เพิ่มคลาสสำหรับวันนี้
            if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                dayElement.classList.add('today');
            }
            
            // เพิ่ม event listener สำหรับการเลือกวันที่
            dayElement.addEventListener('click', () => {
                const selectedDate = new Date(year, month, day);
                const dateString = selectedDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
                
                // ปิดปฏิทินและแสดง modal สำหรับเลือก TFOR ที่จะวางแผน
                calendarPicker.remove();
                showSchedulingModal(dateString);
            });
            
            grid.appendChild(dayElement);
        }
        
        calendarPicker.appendChild(header);
        calendarPicker.appendChild(grid);
        
        // เพิ่มปฏิทินเข้าไปในหน้า
        document.body.appendChild(calendarPicker);
        
        // เพิ่ม event listener สำหรับปุ่มเปลี่ยนเดือน
        header.querySelector('#prev-month').addEventListener('click', () => {
            calendarPicker.remove();
            const prevMonth = month - 1;
            const prevYear = prevMonth < 0 ? year - 1 : year;
            showCalendarPickerForMonth(prevMonth < 0 ? 11 : prevMonth, prevYear);
        });
        
        header.querySelector('#next-month').addEventListener('click', () => {
            calendarPicker.remove();
            const nextMonth = month + 1;
            const nextYear = nextMonth > 11 ? year + 1 : year;
            showCalendarPickerForMonth(nextMonth > 11 ? 0 : nextMonth, nextYear);
        });
        
        // เพิ่ม event listener สำหรับการคลิกนอกปฏิทินเพื่อปิด
        document.addEventListener('click', function closeCalendar(e) {
            if (!calendarPicker.contains(e.target) && e.target !== document.getElementById('plan-work-btn')) {
                calendarPicker.remove();
                document.removeEventListener('click', closeCalendar);
            }
        });
    }
    
    function showSchedulingModalForTransfer(transferData) {
        // แสดง modal สำหรับวางแผนงานของ TFOR ที่เลือก
        const arrivalDate = parseThaiDate(transferData.deliveryDate);
        let dueDateString = 'N/A';
        if (arrivalDate) {
            const dueDate = calculateDueDate(arrivalDate);
            dueDateString = dueDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        }
        
        let modalHtml = `
            <button id="close-details-modal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            <h3 class="text-lg font-bold mb-3">วางแผนงานสำหรับ TFOR ...${transferData.tforNumber}</h3>
            <div class="bg-gray-50 p-4 rounded-lg mb-4">
                <p class="font-semibold">รายละเอียด TFOR</p>
                <p>ทะเบียนรถ: ${transferData.licensePlate}</p>
                <p>สาขาต้นทาง: ${transferData.branch}</p>
                <p>วันที่มาถึง: ${transferData.deliveryDate}</p>
                <p class="text-red-600">ควรเช็คก่อนวันที่: ${dueDateString}</p>
                <p>จำนวนพาเลท: ${transferData.palletCount}</p>
            </div>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">เลือกวันที่ต้องการวางแผน</label>
                <input type="date" id="schedule-date" class="w-full p-2 border rounded-lg" min="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="text-right">
                <button id="save-schedule-btn" class="px-4 py-2 bg-fuchsia-600 text-white rounded-lg">บันทึกแผนงาน</button>
            </div>
        `;
        
        showDetailsModal(modalHtml, true);
        
        // เพิ่ม event listener สำหรับปุ่มบันทึก
        document.getElementById('save-schedule-btn').addEventListener('click', async () => {
            const scheduleDate = document.getElementById('schedule-date').value;
            if (!scheduleDate) {
                showNotification('กรุณาเลือกวันที่ต้องการวางแผน', false);
                return;
            }
            
            // แปลงวันที่เป็นรูปแบบไทย
            const dateObj = new Date(scheduleDate);
            const thaiDateString = dateObj.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
            
            try {
                await updateDoc(doc(db, "transfers", transferData.id), {
                    scheduledDate: thaiDateString,
                    scheduledByUid: currentUser.uid,
                    scheduledByName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`
                });
                
                showNotification('วางแผนงานสำเร็จ');
                document.getElementById('close-details-modal').click();
            } catch (error) {
                console.error("Error scheduling TFOR:", error);
                showNotification('เกิดข้อผิดพลาดในการวางแผนงาน', false);
            }
        });
    }
    
    function calculateDueDate(startDate) {
        let date = new Date(startDate);
        let addedDays = 0;
        while (addedDays < 3) {
            date.setDate(date.getDate() + 1);
            const dayOfWeek = date.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
                addedDays++;
            }
        }
        return date;
    }
    
    function renderCheckView() {
        previousView = detailsView;
        const detailsContainer = document.getElementById('check-details-container');
        const palletButtonsContainer = document.getElementById('pallet-buttons-container');
        const receivePalletButtonsContainer = document.getElementById('receive-pallet-buttons-container');
        const issuePalletButtonsContainer = document.getElementById('issue-pallet-buttons-container');
        const issueFormsContainer = document.getElementById('issue-forms-container');
        
        const arrivalDate = parseThaiDate(currentTforData.deliveryDate);
        let dueDateString = 'N/A';
        if (arrivalDate) {
            const dueDate = calculateDueDate(arrivalDate);
            dueDateString = dueDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        }
        const imagesHTML = (currentTforData.images && currentTforData.images.length > 0) 
            ? `<div class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">${currentTforData.images.map(img => `<a href="${img}" target="_blank"><img src="${img}" class="h-32 w-full object-cover rounded-lg shadow-md"></a>`).join('')}</div>`
            : '<p class="text-sm text-gray-500 mt-2">ไม่มีรูปภาพ</p>';
        detailsContainer.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div><p class="text-sm font-semibold text-gray-500">TFOR / ทะเบียนรถ</p><p class="text-lg font-bold">...${currentTforData.tforNumber} / ${currentTforData.licensePlate}</p></div>
                <div><p class="text-sm font-semibold text-gray-500">สาขาต้นทาง</p><p class="text-lg font-bold">${currentTforData.branch}</p></div>
                <div><p class="text-sm font-semibold text-gray-500">วันที่มาถึง</p><p class="text-lg font-bold">${currentTforData.deliveryDate}</p></div>
                <div><p class="text-sm font-semibold text-red-500">ควรเช็คก่อนวันที่</p><p class="text-lg font-bold text-red-600">${dueDateString}</p></div>
                <div class="md:col-span-2"><p class="text-sm font-semibold text-gray-500">หมายเหตุพาเลท</p><p class="text-lg font-bold">${currentTforData.palletNotes || '-'}</p></div>
            </div>
            <div id="linked-tfor-display" class="mt-4"></div>
            <div class="mt-4"><p class="text-sm font-semibold text-gray-500 mb-2">รูปภาพรวม</p>${imagesHTML}</div>
        `;

        const linkedTforContainer = document.getElementById('linked-tfor-display');
        if (currentTforData.linkedTfors && currentTforData.linkedTfors.length > 0) {
            linkedTforContainer.innerHTML = `
                <p class="text-sm font-semibold text-gray-500">TFOR ที่พ่วงมา</p>
                <div class="flex flex-wrap gap-2 mt-2">
                    ${currentTforData.linkedTfors.map(lt => `<span class="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">${lt}</span>`).join('')}
                </div>
            `;
        } else {
            linkedTforContainer.innerHTML = '';
        }
        
        palletButtonsContainer.innerHTML = '';
        receivePalletButtonsContainer.innerHTML = '';
        issuePalletButtonsContainer.innerHTML = '';
        issueFormsContainer.innerHTML = '';
        (currentTforData.palletNumbers || []).forEach(palletNum => {
            const checkBtn = document.createElement('button');
            checkBtn.className = 'pallet-check-button px-4 py-2 text-sm rounded-full transition-all transform hover:scale-105';
            checkBtn.textContent = `พาเลทที่ ${palletNum}`;
            checkBtn.dataset.palletNumber = palletNum;
            if (currentTforData.checkedPallets?.includes(palletNum)) {
                checkBtn.classList.add('bg-green-500', 'text-white');
            } else {
                checkBtn.classList.add('bg-gray-200');
            }
            checkBtn.addEventListener('click', (e) => handlePalletCheck(palletNum, e.currentTarget));
            palletButtonsContainer.appendChild(checkBtn);
            
            const receiveBtn = document.createElement('button');
            receiveBtn.className = 'pallet-receive-button px-4 py-2 text-sm rounded-full transition-all transform hover:scale-105';
            receiveBtn.textContent = `รับสินค้า พาเลทที่ ${palletNum}`;
            receiveBtn.dataset.palletNumber = palletNum;
            if (currentTforData.receivedPallets?.includes(palletNum)) {
                receiveBtn.classList.add('bg-purple-500', 'text-white');
            } else {
                receiveBtn.classList.add('bg-gray-200');
            }
            receiveBtn.addEventListener('click', (e) => handlePalletReceive(palletNum, e.currentTarget));
            receivePalletButtonsContainer.appendChild(receiveBtn);
        });
        
        // เพิ่มปุ่มรับสินค้าทั้งหมด
        if (currentTforData.checkedPallets && currentTforData.checkedPallets.length > 0) {
            const receiveAllBtn = document.createElement('button');
            receiveAllBtn.className = 'mt-4 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold shadow-lg hover:bg-purple-700';
            receiveAllBtn.textContent = 'รับสินค้าทั้งหมด';
            receiveAllBtn.addEventListener('click', () => handleReceiveAll());
            receivePalletButtonsContainer.appendChild(receiveAllBtn);
        }
        
        // แสดงเฉพาะปุ่มรายงานปัญหารวม
        const issueBtn = document.createElement('button');
        issueBtn.className = 'issue-transfer-button px-4 py-2 text-sm rounded-full transition-all transform hover:scale-105 bg-red-100 text-red-700';
        issueBtn.textContent = `รายงานปัญหาทั้งหมด`;
        issueBtn.addEventListener('click', () => {
            document.querySelectorAll('.issue-pallet-button').forEach(btn => btn.classList.remove('active'));
            issueBtn.classList.add('active');
            renderIssueFormForTransfer();
        });
        issuePalletButtonsContainer.appendChild(issueBtn);
    }
    
    function renderIssueFormForTransfer() {
        const issueFormsContainer = document.getElementById('issue-forms-container');
        issueFormsContainer.innerHTML = ''; 
        const formWrapper = document.createElement('div');
        formWrapper.id = `issue-form-transfer-${currentTforData.id}`;
        formWrapper.className = 'mt-6 border-t pt-6';
        formWrapper.innerHTML = `
            <h3 class="text-xl font-bold text-gray-800 mb-4">รายงานปัญหาสำหรับ TFOR ...${currentTforData.tforNumber}</h3>
            <div class="issue-items-container space-y-4"></div>
            <button type="button" class="add-issue-item-btn mt-4 px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600">+ เพิ่มรายการปัญหา</button>
            <button type="button" class="save-transfer-issues-btn mt-4 ml-2 px-3 py-1 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600">บันทึกปัญหาทั้งหมด</button>
        `;
        issueFormsContainer.appendChild(formWrapper);
        const itemsContainer = formWrapper.querySelector('.issue-items-container');
        
        function addIssueItem() {
            let issueImagesBase64 = [];
            const itemDiv = document.createElement('div');
            itemDiv.className = 'issue-item-form bg-gray-50 p-4 rounded-lg border space-y-4 relative';
            itemDiv.issueImages = issueImagesBase64;
            itemDiv.innerHTML = `
                <button type="button" class="remove-issue-item-btn absolute top-2 right-2 text-red-500 hover:text-red-700">&times;</button>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium">พาเลทที่</label>
                        <select class="issue-pallet-number mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            ${(currentTforData.palletNumbers || []).map(p => `<option value="${p}">พาเลทที่ ${p}</option>`).join('')}
                        </select>
                    </div>
                    <div><label class="block text-sm font-medium">ITEM NUMBER</label><input type="text" class="issue-item-number mt-1 block w-full rounded-md border-gray-300 shadow-sm"></input></div>
                    <div><label class="block text-sm font-medium">จำนวน</label><input type="number" class="issue-quantity mt-1 block w-full rounded-md border-gray-300 shadow-sm"></input></div>
                </div>
                <div>
                    <label class="block text-sm font-medium">รูปรายละเอียดปัญหา</label>
                    <div class="issue-drag-drop mt-1 border-2 border-dashed rounded-md p-4 text-center cursor-pointer">ลากและวางไฟล์ หรือ คลิก</div>
                    <input type="file" class="issue-file-input hidden" multiple accept="image/*">
                    <div class="issue-image-preview grid grid-cols-3 gap-2 mt-2"></div>
                </div>
                <div>
                    <label class="block text-sm font-medium">รายละเอียดปัญหา</label>
                    <div class="grid grid-cols-2 gap-2 mt-1">
                        <label class="flex items-center"><input type="checkbox" value="กล่องชำรุด" class="issue-type-cb rounded"> <span class="ml-2">กล่องชำรุด</span></label>
                        <label class="flex items-center"><input type="checkbox" value="ไม่ติดสติกเกอร์" class="issue-type-cb rounded"> <span class="ml-2">ไม่ติดสติกเกอร์</span></label>
                        <label class="flex items-center"><input type="checkbox" value="สินค้าขาด" class="issue-type-cb rounded"> <span class="ml-2">สินค้าขาด</span></label>
                        <label class="flex items-center"><input type="checkbox" value="สินค้าเกิน" class="issue-type-cb rounded"> <span class="ml-2">สินค้าเกิน</span></label>
                        <label class="flex items-center"><input type="checkbox" value="อื่นๆ" class="issue-type-cb-other rounded"> <span class="ml-2">อื่นๆ</span></label>
                    </div>
                    <textarea class="issue-other-details hidden mt-2 w-full rounded-md border-gray-300 shadow-sm" placeholder="ระบุรายละเอียด..."></textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium">หมายเหตุ</label>
                    <textarea class="issue-notes mt-1 w-full rounded-md border-gray-300 shadow-sm" placeholder="ระบุหมายเหตุเพิ่มเติม..."></textarea>
                </div>
            `;
            itemsContainer.appendChild(itemDiv);
            const dnd = itemDiv.querySelector('.issue-drag-drop');
            const fileInput = itemDiv.querySelector('.issue-file-input');
            const preview = itemDiv.querySelector('.issue-image-preview');
            dnd.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => handleFiles(e.target.files, preview, issueImagesBase64));
            itemDiv.querySelector('.issue-type-cb-other').addEventListener('change', (e) => {
                itemDiv.querySelector('.issue-other-details').classList.toggle('hidden', !e.target.checked);
            });
            itemDiv.querySelector('.remove-issue-item-btn').addEventListener('click', () => itemDiv.remove());
        }
        addIssueItem();
        formWrapper.querySelector('.add-issue-item-btn').addEventListener('click', addIssueItem);
        formWrapper.querySelector('.save-transfer-issues-btn').addEventListener('click', () => saveTransferIssues(formWrapper));
    }
    
    async function saveTransferIssues(formWrapper) {
        try {
            const batch = writeBatch(db);
            for (const itemForm of formWrapper.querySelectorAll('.issue-item-form')) {
                const issueTypes = Array.from(itemForm.querySelectorAll('.issue-type-cb:checked')).map(cb => cb.value);
                if (itemForm.querySelector('.issue-type-cb-other:checked')) {
                    issueTypes.push(itemForm.querySelector('.issue-other-details').value || 'อื่นๆ');
                }
                const imagesForThisItem = itemForm.issueImages || [];
                const newIssue = {
                    ...currentTforData,
                    transferId: currentTforData.id,
                    palletNumber: itemForm.querySelector('.issue-pallet-number').value,
                    itemNumber: itemForm.querySelector('.issue-item-number').value,
                    quantity: itemForm.querySelector('.issue-quantity').value,
                    issueTypes: issueTypes.length > 0 ? issueTypes : ['อื่นๆ'],
                    issueNotes: itemForm.querySelector('.issue-other-details').value,
                    notes: itemForm.querySelector('.issue-notes').value, // Add the notes field
                    issueImages: imagesForThisItem,
                    reportDate: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
                    reportedByUid: currentUser.uid,
                    reportedByName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`,
                    checkerUid: currentTforData.lastCheckedByUid || null,
                    checkerName: currentTforData.lastCheckedByName || null
                };
                delete newIssue.id;
                batch.set(doc(collection(db, "issues")), newIssue);
            }
            await batch.commit();
            showNotification(`บันทึกปัญหาสำหรับ TFOR ...${currentTforData.tforNumber} เรียบร้อยแล้ว!`);
            formWrapper.remove();
            document.querySelectorAll('.issue-pallet-button').forEach(btn => btn.classList.remove('active'));
        } catch (error) {
            console.error("Error saving issue: ", error);
            showNotification('เกิดข้อผิดพลาดในการบันทึกปัญหา', false);
        }
    }
    
    function renderCompletedView(filter = '') {
        const container = document.getElementById('completed-container');
        const filteredData = completedTransfersData.filter(d => d.isCompleted && d.isReceived);
        if (filter) {
            filteredData = filteredData.filter(d => 
                (d.tforNumber || '').includes(filter) || 
                (d.licensePlate || '').toLowerCase().includes(filter.toLowerCase()) ||
                (d.branch || '').toLowerCase().includes(filter.toLowerCase())
            );
        }
        container.innerHTML = filteredData.length === 0 ? `<p class="text-gray-500 text-center">ไม่พบข้อมูลที่เช็คเสร็จแล้ว</p>` : '';
        filteredData.forEach(data => {
            const card = document.createElement('div');
            card.className = 'bg-white p-6 rounded-2xl shadow-md border border-gray-200';
            const imagesHTML = (data.images && data.images.length > 0) 
                ? `<div class="mt-4 grid grid-cols-3 gap-2">${data.images.slice(0,3).map(img => `<img src="${img}" class="h-24 w-full object-cover rounded-md cursor-pointer" onclick="document.getElementById('details-modal').dispatchEvent(new CustomEvent('showDetails', { detail: { item: JSON.parse(this.dataset.item) } }))" data-item='${JSON.stringify(data)}'>`).join('')}</div>`
                : '<p class="text-sm text-gray-400 mt-4">ไม่มีรูปภาพ</p>';
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <p class="text-sm text-gray-500">วันที่เช็คเสร็จ</p>
                        <p class="font-semibold">${data.completionDate}</p>
                        <p class="text-sm text-gray-500 mt-2">วันที่รับสินค้า</p>
                        <p class="font-semibold">${data.receivedDate || '-'}</p>
                    </div>
                    <div class="delete-permission"></div>
                </div>
                <hr class="my-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><p class="text-sm text-gray-500">ทะเบียนรถ</p><p class="font-semibold">${data.licensePlate}</p></div>
                    <div><p class="text-sm text-gray-500">TFOR</p><p class="font-semibold">...${data.tforNumber}</p></div>
                    <div><p class="text-sm text-gray-500">สาขา</p><p class="font-semibold">${data.branch}</p></div>
                    <div><p class="text-sm text-gray-500">ผู้เช็คคนล่าสุด</p><p class="font-semibold">${data.lastCheckedByName || 'N/A'}</p></div>
                    <div class="md:col-span-2"><p class="text-sm text-gray-500">หมายเหตุพาเลท</p><p class="font-semibold">${data.palletNotes || '-'}</p></div>
                </div>
                ${imagesHTML}
            `;
            
            const adminCell = card.querySelector('.delete-permission');
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;
            deleteButton.className = 'text-red-500 hover:text-red-700';
            deleteButton.onclick = () => deleteTransfer(data.id);
            adminCell.appendChild(deleteButton);
            
            container.appendChild(card);
        });
        updateUIForRoles();
    }
    
    detailsModal.addEventListener('showDetails', (e) => showDetailsModal(e.detail.item));
    
    document.getElementById('completed-search').addEventListener('input', (e) => renderCompletedView(e.target.value));
    
    function renderIssuesView() {
        const container = document.getElementById('issues-container');
        container.innerHTML = '';
        
        // แสดงรายการมีปัญหาทั้งหมด (ไม่กรองเฉพาะวันนี้)
        const allIssues = Object.values(issuesData)
            .flat();
        
        if (allIssues.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center">ไม่พบรายการสินค้ามีปัญหา</p>`;
            return;
        }
        
        // จัดกลุ่มตามประเภทปัญหา
        const issuesByType = {};
        allIssues.forEach(issue => {
            (issue.issueTypes || ['อื่นๆ']).forEach(type => {
                if (!issuesByType[type]) issuesByType[type] = [];
                issuesByType[type].push(issue);
            });
        });
        
        Object.keys(issuesByType).sort().forEach(category => {
            if (issuesByType[category]?.length > 0) {
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'bg-white rounded-lg shadow-md';
                categoryDiv.innerHTML = `
                    <div class="issue-category-header p-4 flex justify-between items-center cursor-pointer">
                        <h3 class="font-semibold text-lg">${category} (${issuesByType[category].length})</h3>
                        <span class="text-gray-500">▼</span>
                    </div>
                    <div class="issue-list hidden p-4 border-t space-y-2"></div>
                `;
                const issueList = categoryDiv.querySelector('.issue-list');
                issuesByType[category].forEach(issue => {
                    const issueItem = document.createElement('div');
                    const allImages = [...(issue.issueImages || []), ...(issue.images || [])];
                    const imageThumb = allImages.length > 0 ? `<img src="${allImages[0]}" class="w-12 h-12 object-cover rounded-md mr-4">` : '';
                    
                    // Display both checker and reporter information
                    let userDisplay = `<div class="text-sm text-gray-600">ผู้รายงาน: ${issue.reportedByName || 'N/A'}</div>`;
                    if (issue.checkerName && issue.checkerName !== issue.reportedByName) {
                        userDisplay += `<div class="text-sm text-blue-600">ผู้เช็ค: ${issue.checkerName}</div>`;
                    }
                    
                    // Display notes if available
                    let notesDisplay = '';
                    if (issue.notes) {
                        notesDisplay = `<div class="text-sm text-purple-600 mt-1">หมายเหตุ: ${issue.notes}</div>`;
                    }
                    
                    // Display report date
                    let reportDateDisplay = `<div class="text-sm text-green-600 mt-1">วันที่รายงาน: ${issue.reportDate || 'N/A'}</div>`;
                    
                    issueItem.className = 'p-2 hover:bg-gray-100 rounded-md flex justify-between items-center';
                    issueItem.innerHTML = `
                        <div class="cursor-pointer flex-grow flex items-center">
                            ${imageThumb}
                            <div>
                                <p>${issue.deliveryDate} | ${issue.licensePlate} | ...${issue.tforNumber}</p>
                                <p class="text-sm text-red-600">${issue.issueTypes.join(', ')}</p>
                                ${userDisplay}
                                ${notesDisplay}
                                ${reportDateDisplay}
                            </div>
                        </div>`;
                    issueItem.querySelector('div').addEventListener('click', () => showDetailsModal(issue));
                    
                    const deleteButton = document.createElement('button');
                    deleteButton.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
                    deleteButton.className = 'text-red-400 hover:text-red-600 ml-4 flex-shrink-0 delete-permission';
                    deleteButton.onclick = () => deleteIssue(issue.id);
                    issueItem.appendChild(deleteButton);
                    
                    issueList.appendChild(issueItem);
                });
                categoryDiv.querySelector('.issue-category-header').addEventListener('click', (e) => {
                    e.currentTarget.nextElementSibling.classList.toggle('hidden');
                });
                container.appendChild(categoryDiv);
            }
        });
        
        updateUIForRoles();
    }
    
    function showDetailsModal(item, isHtml = false) {
        detailsModalContent.innerHTML = `<button id="close-details-modal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>`;
        if (isHtml) {
            detailsModalContent.innerHTML += item;
        } else {
            const allImages = [...(item.images || []), ...(item.issueImages || [])];
            const imagesHTML = allImages.length > 0 
                ? `<div class="grid grid-cols-2 gap-2">${allImages.map(img => `<a href="${img}" target="_blank"><img src="${img}" class="rounded-lg w-full h-auto"></a>`).join('')}</div>`
                : 'ไม่มีรูปภาพ';
            
            // Display both checker and reporter information
            let userDisplay = `<p><strong>ผู้รายงาน:</strong> ${item.reportedByName || 'N/A'}</p>`;
            if (item.checkerName && item.checkerName !== item.reportedByName) {
                userDisplay += `<p><strong>ผู้เช็ค:</strong> ${item.checkerName}</p>`;
            }
            
            // Display notes if available
            let notesDisplay = '';
            if (item.notes) {
                notesDisplay = `<p><strong>หมายเหตุ:</strong> ${item.notes}</p>`;
            }
            
            detailsModalContent.innerHTML += `
                <h2 class="text-xl font-bold mb-4">รายละเอียด</h2>
                <div class="space-y-3">
                    <p><strong>วันที่:</strong> ${item.deliveryDate}</p>
                    <p><strong>ทะเบียนรถ:</strong> ${item.licensePlate}</p>
                    <p><strong>TFOR:</strong> ...${item.tforNumber}</p>
                    <p><strong>สาขา:</strong> ${item.branch}</p>
                    <p><strong>ประเภทปัญหา:</strong> ${item.issueTypes ? item.issueTypes.join(', ') : 'N/A'}</p>
                    <p><strong>Item Number:</strong> ${item.itemNumber || '-'}</p>
                    <p><strong>จำนวนสินค้า:</strong> ${item.quantity || '-'}</p>
                    <p><strong>หมายเหตุ:</strong> ${item.issueNotes || item.notes || '-'}</p>
                    ${notesDisplay}
                    ${userDisplay}
                    <p><strong>รูปภาพ:</strong></p>
                    ${imagesHTML}
                </div>
            `;
        }
        detailsModal.classList.remove('hidden');
        detailsModal.classList.add('flex');
    }
    
    // MODAL CLOSE LOGIC (EVENT DELEGATION)
    detailsModal.addEventListener('click', (e) => {
        if (e.target.id === 'close-details-modal' || e.target.id === 'details-modal') {
             detailsModal.classList.add('hidden');
             detailsModal.classList.remove('flex');
        }
        const taskItem = e.target.closest('.calendar-task-item');
        if (taskItem && !e.target.classList.contains('unschedule-btn')) {
            const transferId = taskItem.dataset.id;
            const allTransfers = [...allTransfersData, ...completedTransfersData];
            const transferData = allTransfers.find(t => t.id === transferId);
            if (transferData) {
                currentTforData = transferData;
                detailsModal.classList.add('hidden');
                detailsModal.classList.remove('flex');
                showMainView(views.transfers);
                renderCheckView();
                showSubView(checkView);
            }
        }
        const statsItem = e.target.closest('.stats-detail-item');
        if (statsItem) {
            const transferId = statsItem.dataset.id;
            const allTransfers = [...allTransfersData, ...completedTransfersData];
            const transferData = allTransfers.find(t => t.id === transferId);
            if (transferData) {
                currentTforData = transferData;
                detailsModal.classList.add('hidden');
                detailsModal.classList.remove('flex');
                showMainView(views.transfers);
                renderCheckView();
                showSubView(checkView);
            } else {
                showNotification("ไม่พบข้อมูล TFOR ที่เกี่ยวข้อง", false);
            }
        }
    });
    
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    let chatHistory = [];
    
    function addChatMessage(message, sender) {
        const bubble = document.createElement('div');
        bubble.classList.add('chat-bubble', sender === 'user' ? 'user-bubble' : 'ai-bubble');
        bubble.textContent = message;
        chatMessages.appendChild(bubble);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        if (sender === 'user') chatHistory.push({ role: 'user', parts: [{ text: message }] });
        else chatHistory.push({ role: 'model', parts: [{ text: message }] });
    }
    
    addChatMessage('สวัสดีครับ ผม INBOUND-ASSISTANT ผู้ช่วย AI อารมณ์ดี พร้อมให้บริการครับ! ไม่ว่าจะเป็นการค้นหาข้อมูล TFOR, สรุปยอด, หรือขั้นตอนการใช้งานต่างๆ ถามมาได้เลยครับ!', 'ai');
    
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;
        addChatMessage(userMessage, 'user');
        chatInput.value = '';
        const thinkingBubble = document.createElement('div');
        thinkingBubble.classList.add('chat-bubble', 'ai-bubble');
        thinkingBubble.textContent = 'กำลังประมวลผล...';
        chatMessages.appendChild(thinkingBubble);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        const dataContext = JSON.stringify({transfers: allTransfersData, issues: issuesData});
        const fullPrompt = `คุณคือผู้ช่วย AI ของ INBOUND SYSTEM. จงตอบคำถามต่อไปนี้ให้กระชับและสั้นที่สุด โดยใช้ข้อมูลจาก JSON ที่ให้มาเท่านั้น ห้ามใช้ความรู้ทั่วไปในการตอบ. หากข้อมูลไม่มีใน JSON ให้ตอบว่า "ไม่พบข้อมูล". ข้อมูล JSON: ${dataContext} คำถาม: "${userMessage}"`;
        try {
            const aiResponse = await callGeminiAPI(fullPrompt);
            thinkingBubble.remove();
            addChatMessage(aiResponse, 'ai');
        } catch (error) {
            thinkingBubble.textContent = 'ขออภัยค่ะ ระบบ AI กำลังมีผู้ใช้งานจำนวนมาก กรุณาลองใหม่อีกครั้ง';
            console.error("AI Error:", error);
        }
    });
    
    document.querySelectorAll('.animated-icon').forEach(icon => {
        icon.addEventListener('click', () => {
            icon.classList.add('pulse');
            setTimeout(() => icon.classList.remove('pulse'), 500);
        });
    });
    
    const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const thaiMonthMap = thaiMonths.reduce((map, month, i) => { map[month] = i; return map; }, {});
    
    function parseThaiDate(thaiDateStr) {
        if (!thaiDateStr) return null;
        const parts = thaiDateStr.split(' ');
        if (parts.length !== 3) return null;
        const day = parseInt(parts[0], 10);
        const month = thaiMonthMap[parts[1]];
        const year = parseInt(parts[2], 10) - 543;
        if (isNaN(day) || month === undefined || isNaN(year)) return null;
        return new Date(year, month, day);
    }
    
    function renderCalendar(dateToDisplay) {
        const container = document.getElementById('calendar-container');
        container.innerHTML = '';
        const month = dateToDisplay.getMonth();
        const year = dateToDisplay.getFullYear();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        const header = document.createElement('div');
        header.className = 'flex justify-between items-center mb-4';
        header.innerHTML = `
            <button id="prev-month" class="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300">&lt;</button>
            <h2 class="text-xl font-semibold">${thaiMonths[month]} ${year + 543}</h2>
            <button id="next-month" class="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300">&gt;</button>
        `;
        container.appendChild(header);
        header.querySelector('#prev-month').addEventListener('click', () => renderCalendar(new Date(year, month - 1, 1)));
        header.querySelector('#next-month').addEventListener('click', () => renderCalendar(new Date(year, month + 1, 1)));
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-7 gap-2 text-center';
        const daysOfWeek = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
        daysOfWeek.forEach(day => grid.innerHTML += `<div class="font-bold text-gray-600">${day}</div>`);
        for (let i = 0; i < firstDay; i++) grid.innerHTML += '<div></div>';
        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day p-2 rounded-lg';
            dayEl.textContent = day;
            if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                dayEl.classList.add('today');
            }
            const currentDate = new Date(year, month, day);
            const currentDateString = currentDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
            
            const newEntriesOnDay = allTransfersData.filter(t => parseThaiDate(t.deliveryDate)?.toDateString() === currentDate.toDateString());
            const scheduledOnDay = allTransfersData.filter(t => t.scheduledDate === currentDateString);
            const completedOnDay = completedTransfersData.filter(t => parseThaiDate(t.completionDate)?.toDateString() === currentDate.toDateString());
            
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'event-dots-container';
            if (newEntriesOnDay.length > 0) dotsContainer.innerHTML += '<div class="event-dot event-dot-blue"></div>';
            if (scheduledOnDay.length > 0) dotsContainer.innerHTML += '<div class="event-dot event-dot-purple"></div>';
            if (completedOnDay.length > 0) dotsContainer.innerHTML += '<div class="event-dot event-dot-green"></div>';
            dayEl.appendChild(dotsContainer);
            dayEl.addEventListener('click', () => showDayDetailsModal(currentDateString));
            grid.appendChild(dayEl);
        }
        container.appendChild(grid);
    }
    
    function showDayDetailsModal(dateString) {
        const dateObj = parseThaiDate(dateString);
        const newEntriesOnDay = allTransfersData.filter(t => parseThaiDate(t.deliveryDate)?.toDateString() === dateObj?.toDateString());
        const scheduledOnDay = allTransfersData.filter(t => t.scheduledDate === dateString);
        const completedOnDay = completedTransfersData.filter(t => parseThaiDate(t.completionDate)?.toDateString() === dateObj?.toDateString());
        let modalHtml = `
            <button id="close-details-modal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            <h3 class="text-lg font-bold mb-3">รายละเอียดวันที่ ${dateString}</h3>
        `;
        let hasContent = false;
        if (scheduledOnDay.length > 0) {
            hasContent = true;
            modalHtml += '<h4 class="font-semibold mt-4 text-purple-600">งานที่วางแผนไว้</h4><div class="space-y-2 border-l-4 border-purple-200 pl-4 py-2">';
            scheduledOnDay.forEach(e => {
                modalHtml += `<div class="p-2 bg-purple-50 rounded-md flex justify-between items-center hover:bg-purple-100 cursor-pointer calendar-task-item" data-id="${e.id}">
                    <span><strong>TFOR:</strong> ...${e.tforNumber} (โดย ${e.scheduledByName || 'N/A'})</span>
                    <button class="unschedule-btn text-xs text-red-500 hover:underline plan-work-permission" data-id="${e.id}">ยกเลิก</button>
                </div>`;
            });
            modalHtml += '</div>';
        }
        
        if (newEntriesOnDay.length > 0) {
            hasContent = true;
            modalHtml += '<h4 class="font-semibold mt-4 text-blue-600">TFORs ที่มาถึง</h4><div class="space-y-2 border-l-4 border-blue-200 pl-4 py-2">';
            newEntriesOnDay.forEach(e => {
                 modalHtml += `<div class="p-2 bg-blue-50 rounded-md hover:bg-blue-100 cursor-pointer calendar-task-item" data-id="${e.id}">
                    <span><strong>TFOR:</strong> ...${e.tforNumber} (${e.branch})</span>
                </div>`;
            });
            modalHtml += '</div>';
        }
        if (completedOnDay.length > 0) {
            hasContent = true;
            modalHtml += '<h4 class="font-semibold mt-4 text-green-600">TFORs ที่เช็คเสร็จ</h4><div class="space-y-2 border-l-4 border-green-200 pl-4 py-2">';
            completedOnDay.forEach(e => {
                 modalHtml += `<div class="p-2 bg-green-50 rounded-md hover:bg-green-100 cursor-pointer calendar-task-item" data-id="${e.id}">
                    <span><strong>TFOR:</strong> ...${e.tforNumber} (โดย ${e.lastCheckedByName || 'N/A'})</span>
                </div>`;
            });
            modalHtml += '</div>';
        }
        if (!hasContent) {
            modalHtml += '<p class="text-gray-500 mt-4">ไม่มีกิจกรรมสำหรับวันนี้</p>';
        }
        modalHtml += `<div class="mt-6 text-center plan-work-permission">
            <button id="open-scheduler-btn" class="px-6 py-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700">วางแผนงานสำหรับวันนี้</button>
        </div>`;
        
        showDetailsModal(modalHtml, true);
        updateUIForRoles();
        
        document.getElementById('open-scheduler-btn')?.addEventListener('click', () => showSchedulingModal(dateString));
        document.querySelectorAll('.unschedule-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent modal click handler from firing
                const transferId = e.target.dataset.id;
                try {
                    await updateDoc(doc(db, "transfers", transferId), { scheduledDate: null, scheduledByUid: null, scheduledByName: null });
                    showNotification('ยกเลิกแผนงานสำเร็จ');
                    document.getElementById('close-details-modal').click();
                } catch (error) {
                    showNotification('เกิดข้อผิดพลาดในการยกเลิก', false);
                }
            });
        });
    }
    
    function showSchedulingModal(dateString) {
        const pendingToSchedule = allTransfersData.filter(t => !t.scheduledDate);
        let modalHtml = `
            <button id="close-details-modal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            <h3 class="text-lg font-bold mb-3">เลือก TFOR เพื่อวางแผนสำหรับวันที่ ${dateString}</h3>
            <div id="scheduling-list" class="space-y-2 max-h-60 overflow-y-auto border p-2 rounded-lg">
        `;
        if (pendingToSchedule.length > 0) {
            pendingToSchedule.forEach(t => {
                modalHtml += `
                    <label class="flex items-center p-2 rounded-md hover:bg-gray-100">
                        <input type="checkbox" class="form-checkbox h-5 w-5 text-fuchsia-600 rounded" value="${t.id}">
                        <span class="ml-3">TFOR: ...${t.tforNumber} (${t.branch})</span>
                        <div class="ml-auto text-sm text-gray-500">
                            <p>วันที่มา: ${t.deliveryDate}</p>
                            <p>ทะเบียน: ${t.licensePlate}</p>
                            <p>จำนวนพาเลท: ${t.palletCount}</p>
                        </div>
                    </label>
                `;
            });
        } else {
            modalHtml += '<p class="text-gray-500">ไม่มีรายการที่รอดำเนินการเพื่อวางแผน</p>';
        }
        modalHtml += `</div><div class="mt-4 text-right">
            <button id="save-schedule-btn" class="px-6 py-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700">บันทึกแผนงาน</button>
        </div>`;
        showDetailsModal(modalHtml, true);
        
        document.getElementById('save-schedule-btn').addEventListener('click', async () => {
            const selectedIds = Array.from(document.querySelectorAll('#scheduling-list input:checked')).map(cb => cb.value);
            if (selectedIds.length === 0) {
                showNotification('กรุณาเลือกอย่างน้อย 1 รายการ', false); return;
            }
            try {
                const batch = writeBatch(db);
                selectedIds.forEach(id => {
                    const docRef = doc(db, "transfers", id);
                    batch.update(docRef, { 
                        scheduledDate: dateString, 
                        scheduledByUid: currentUser.uid,
                        scheduledByName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`
                    });
                });
                await batch.commit();
                showNotification(`วางแผนงานสำหรับ ${selectedIds.length} รายการสำเร็จ!`);
                document.getElementById('close-details-modal').click();
            } catch (error) {
                console.error("Error scheduling TFORs:", error);
                showNotification('เกิดข้อผิดพลาดในการบันทึกแผนงาน', false);
            }
        });
    }
    
    function renderCheckProductView() {
        // แสดงรายการที่เช็คแล้วแต่ยังไม่ได้รับ (checked but not received)
        const checkedTforContainer = document.getElementById('checked-tfor-container');
        checkedTforContainer.innerHTML = '';
        
        // หา TFOR ที่เช็คแล้วอย่างน้อย 1 พาเลท แต่ยังไม่ได้รับสินค้า (receivedPallets ว่างหรือไม่ครบ)
        const checkedNotReceived = allTransfersData.filter(t => 
            t.checkedPallets && t.checkedPallets.length > 0 && 
            (!t.receivedPallets || t.receivedPallets.length < t.checkedPallets.length)
        );
        
        if (checkedNotReceived.length === 0) {
            checkedTforContainer.innerHTML = '<p class="text-gray-500 text-center">ไม่มีรายการที่ต้องรับสินค้า</p>';
        } else {
            checkedNotReceived.forEach(data => {
                const card = document.createElement('div');
                card.className = 'bg-white p-6 rounded-2xl shadow-md border border-gray-200 cursor-pointer hover:shadow-lg waiting-receive-card';
                
                const checkedCount = data.checkedPallets ? data.checkedPallets.length : 0;
                const receivedCount = data.receivedPallets ? data.receivedPallets.length : 0;
                const totalCount = data.palletNumbers ? data.palletNumbers.length : 0;
                
                card.innerHTML = `
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div><p class="text-sm text-gray-500">ทะเบียนรถ</p><p class="font-semibold">${data.licensePlate}</p></div>
                        <div><p class="text-sm text-gray-500">TFOR</p><p class="font-semibold">...${data.tforNumber}</p></div>
                        <div><p class="text-sm text-gray-500">สาขา</p><p class="font-semibold">${data.branch}</p></div>
                        <div><p class="text-sm text-gray-500">จำนวนพาเลท</p><p class="font-semibold">${checkedCount}/${totalCount} (เช็คแล้ว ${checkedCount}, รับแล้ว ${receivedCount})</p></div>
                    </div>
                `;
                card.addEventListener('click', () => {
                    currentTforData = data;
                    showMainView(views.transfers);
                    renderCheckView();
                    showSubView(checkView);
                });
                checkedTforContainer.appendChild(card);
            });
        }
    }
    
    function renderTodaysPlanView() {
        const container = document.getElementById('todays-plan-container');
        container.innerHTML = '';
        
        // Get today's date in Thai format
        const today = new Date();
        const todayString = today.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        
        // Get all transfers (both pending and completed)
        const allTransfers = [...allTransfersData, ...completedTransfersData];
        
        // Filter transfers scheduled for today
        const todaysTransfers = allTransfers.filter(t => t.scheduledDate === todayString);
        
        if (todaysTransfers.length === 0) {
            container.innerHTML = `
                <div class="bg-white rounded-2xl shadow-lg p-8 text-center">
                    <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <h3 class="text-xl font-bold text-gray-700 mb-2">ไม่มีงานวางแผนสำหรับวันนี้</h3>
                    <p class="text-gray-500">คุณสามารถวางแผนงานได้ที่หน้าปฏิทิน</p>
                    <button class="mt-4 px-4 py-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 plan-work-permission">
                        วางแผนงานสำหรับวันนี้
                    </button>
                </div>
            `;
            
            // Add event listener to the planning button
            const planButton = container.querySelector('.plan-work-permission');
            if (planButton) {
                planButton.addEventListener('click', () => {
                    showMainView(views.calendar);
                    renderCalendar(new Date());
                    // Show scheduling modal for today
                    setTimeout(() => {
                        showSchedulingModal(todayString);
                    }, 300);
                });
            }
            
            return;
        }
        
        // Group transfers by status
        const pendingTransfers = todaysTransfers.filter(t => !t.isCompleted);
        const completedTransfers = todaysTransfers.filter(t => t.isCompleted);
        
        // Render pending transfers
        if (pendingTransfers.length > 0) {
            const pendingSection = document.createElement('div');
            pendingSection.className = 'mb-8';
            pendingSection.innerHTML = `
                <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <span class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                    งานที่รอดำเนินการ (${pendingTransfers.length})
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
            `;
            
            const pendingContainer = pendingSection.querySelector('.grid');
            pendingTransfers.forEach(transfer => {
                const card = document.createElement('div');
                card.className = 'bg-white p-4 rounded-xl shadow-md border-l-4 border-yellow-500 cursor-pointer hover:shadow-lg transition-shadow';
                card.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-bold text-lg">...${transfer.tforNumber}</p>
                            <p class="text-sm text-gray-600">${transfer.branch}</p>
                            <p class="text-sm text-gray-500">${transfer.licensePlate}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xs text-gray-500">พาเลท</p>
                            <p class="font-bold">${transfer.palletCount}</p>
                        </div>
                    </div>
                    <div class="mt-3 flex justify-between items-center">
                        <span class="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                            โดย ${transfer.scheduledByName || 'N/A'}
                        </span>
                        <button class="text-xs text-red-500 hover:text-red-700 plan-work-permission" data-id="${transfer.id}">
                            ยกเลิกแผน
                        </button>
                    </div>
                `;
                
                // Add click event to navigate to check view
                card.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('plan-work-permission')) {
                        currentTforData = transfer;
                        showMainView(views.transfers);
                        renderCheckView();
                        showSubView(checkView);
                    }
                });
                
                // Add event to cancel plan
                card.querySelector('.plan-work-permission').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    try {
                        await updateDoc(doc(db, "transfers", transfer.id), { 
                            scheduledDate: null, 
                            scheduledByUid: null, 
                            scheduledByName: null 
                        });
                        showNotification('ยกเลิกแผนงานสำเร็จ');
                        renderTodaysPlanView(); // Refresh the view
                    } catch (error) {
                        showNotification('เกิดข้อผิดพลาดในการยกเลิก', false);
                    }
                });
                
                pendingContainer.appendChild(card);
            });
            
            container.appendChild(pendingSection);
        }
        
        // Render completed transfers
        if (completedTransfers.length > 0) {
            const completedSection = document.createElement('div');
            completedSection.innerHTML = `
                <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <span class="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    งานที่เสร็จสิ้น (${completedTransfers.length})
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
            `;
            
            const completedContainer = completedSection.querySelector('.grid');
            completedTransfers.forEach(transfer => {
                const card = document.createElement('div');
                card.className = 'bg-white p-4 rounded-xl shadow-md border-l-4 border-green-500 cursor-pointer hover:shadow-lg transition-shadow';
                card.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-bold text-lg">...${transfer.tforNumber}</p>
                            <p class="text-sm text-gray-600">${transfer.branch}</p>
                            <p class="text-sm text-gray-500">${transfer.licensePlate}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xs text-gray-500">พาเลท</p>
                            <p class="font-bold">${transfer.palletCount}</p>
                        </div>
                    </div>
                    <div class="mt-3">
                        <span class="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                            เสร็จสิ้น ${transfer.completionDate || 'N/A'}
                        </span>
                    </div>
                `;
                
                // Add click event to navigate to check view
                card.addEventListener('click', () => {
                    currentTforData = transfer;
                    showMainView(views.transfers);
                    renderCheckView();
                    showSubView(checkView);
                });
                
                completedContainer.appendChild(card);
            });
            
            container.appendChild(completedSection);
        }
        
        // Update UI for roles
        updateUIForRoles();
    }
    
    function getStatsData(timeframe = 'month') {
         const now = new Date();
        let startDate;
        if (timeframe === 'week') {
            startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        } else if (timeframe === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else { // year
            startDate = new Date(now.getFullYear(), 0, 1);
        }
        startDate.setHours(0, 0, 0, 0);
        const allData = [...allTransfersData, ...completedTransfersData];
        const filteredData = allData.filter(d => {
            const dDate = d.createdAt?.toDate ? d.createdAt.toDate() : parseThaiDate(d.deliveryDate);
            return dDate && dDate >= startDate;
        });
        
        const totalInbound = filteredData.length;
        const totalCompleted = filteredData.filter(d => d.isCompleted).length;
        const totalReceived = filteredData.filter(d => d.isReceived).length;
        const totalPallets = filteredData.reduce((sum, item) => sum + (item.palletCount || 0), 0);
        const allIssues = Object.values(issuesData).flat();
        const totalIssues = allIssues.filter(i => {
            const iDate = i.createdAt?.toDate ? i.createdAt.toDate() : parseThaiDate(i.reportDate);
            return iDate && iDate >= startDate;
        }).length;
        
        const overdueItems = allTransfersData.filter(t => {
            const tDate = parseThaiDate(t.deliveryDate);
            if (!tDate) return false;
            const dueDate = calculateDueDate(tDate);
            return dueDate < new Date();
        });
        const totalOverdue = overdueItems.length;
        return {
            filteredData,
            totalInbound,
            totalCompleted,
            totalReceived,
            totalPallets,
            totalIssues,
            overdueItems,
            totalOverdue
        };
    }
    
    function renderAdvancedStatistics(timeframe = 'month') {
        const container = document.getElementById('statistics-container');
        const chartsContainer = document.getElementById('charts-container');
        const reportTitle = document.getElementById('report-title');
        container.innerHTML = '';
        chartsContainer.innerHTML = '';
        Object.values(currentChartInstances).forEach(chart => chart.destroy());
        currentChartInstances = {};
        const stats = getStatsData(timeframe);
        if (timeframe === 'week') reportTitle.textContent = 'รายงานสรุปผลประจำสัปดาห์';
        else if (timeframe === 'month') reportTitle.textContent = 'รายงานสรุปผลประจำเดือน';
        else reportTitle.textContent = 'รายงานสรุปผลประจำปี';
        
        const cardsData = [
            { title: 'ของเข้าทั้งหมด', value: stats.totalInbound, color: 'bg-blue-100', textColor: 'text-blue-800', items: stats.filteredData },
            { title: 'เช็คเสร็จแล้ว', value: stats.totalCompleted, color: 'bg-green-100', textColor: 'text-green-800', items: stats.filteredData.filter(d => d.isCompleted) },
            { title: 'รับสินค้าแล้ว', value: stats.totalReceived, color: 'bg-purple-100', textColor: 'text-purple-800', items: stats.filteredData.filter(d => d.isReceived) },
            { title: 'คงค้าง (ล่าช้า)', value: stats.totalOverdue, color: 'bg-red-100', textColor: 'text-red-800', items: stats.overdueItems },
            { title: 'พาเลททั้งหมด', value: stats.totalPallets, color: 'bg-indigo-100', textColor: 'text-indigo-800', items: stats.filteredData },
            { title: 'สินค้ามีปัญหา', value: stats.totalIssues, color: 'bg-yellow-100', textColor: 'text-yellow-800', items: Object.values(issuesData).flat().filter(i => { const iDate = i.createdAt?.toDate ? i.createdAt.toDate() : parseThaiDate(i.reportDate); return iDate && iDate >= new Date(new Date().getFullYear(), 0, 1);}) }
        ];
        container.innerHTML = ''; // Clear previous cards
        cardsData.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = `p-6 rounded-2xl shadow-lg ${card.color} cursor-pointer hover:scale-105 transition-transform`;
            cardEl.innerHTML = `<h3 class="font-semibold text-lg ${card.textColor}">${card.title}</h3><p class="text-4xl font-bold mt-2 ${card.textColor}">${card.value}</p>`;
            cardEl.addEventListener('click', () => showStatsDetailModal(card.title, card.items));
            container.appendChild(cardEl);
        });
        // Chart 1: Inbound by Branch
        const branchChartContainer = document.createElement('div');
        branchChartContainer.className = 'p-6 bg-white rounded-2xl shadow-inner';
        branchChartContainer.innerHTML = '<h3 class="text-xl font-bold mb-4">จำนวนของเข้าตามสาขา</h3><div class="relative h-64 md:h-80"><canvas id="branch-bar-chart"></canvas></div>';
        chartsContainer.appendChild(branchChartContainer);
        const branchCounts = stats.filteredData.reduce((acc, t) => {
            if(t.branch) acc[t.branch] = (acc[t.branch] || 0) + 1;
            return acc;
        }, {});
        const branchCtx = document.getElementById('branch-bar-chart').getContext('2d');
        currentChartInstances.branchChart = new Chart(branchCtx, {
            type: 'bar',
            data: { labels: Object.keys(branchCounts), datasets: [{ label: 'จำนวน TFORs', data: Object.values(branchCounts), backgroundColor: '#a855f7' }] },
            options: { scales: { y: { beginAtZero: true } }, responsive: true, maintainAspectRatio: false }
        });
        // Chart 2: Status Distribution
        const statusChartContainer = document.createElement('div');
        statusChartContainer.className = 'p-6 bg-white rounded-2xl shadow-inner';
        statusChartContainer.innerHTML = '<h3 class="text-xl font-bold mb-4">สถานะการดำเนินงาน</h3><div class="relative h-64 md:h-80"><canvas id="status-pie-chart"></canvas></div>';
        chartsContainer.appendChild(statusChartContainer);
        const statusCtx = document.getElementById('status-pie-chart').getContext('2d');
        currentChartInstances.statusChart = new Chart(statusCtx, {
            type: 'pie',
            data: { 
                labels: ['เช็คเสร็จแล้ว', 'รับสินค้าแล้ว', 'รอดำเนินการ'], 
                datasets: [{ 
                    data: [stats.totalCompleted, stats.totalReceived, stats.totalInbound - stats.totalCompleted], 
                    backgroundColor: ['#22c55e', '#a855f7', '#f59e0b'] 
                }] 
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    
    function showStatsDetailModal(title, items) {
        let listHtml = '';
        if (items.length === 0) {
            listHtml = '<p class="text-gray-500 text-center">ไม่พบข้อมูล</p>';
        } else {
            listHtml = items.map(item => {
                const transferId = item.id || item.transferId; 
                let detailText = `ทะเบียน: ${item.licensePlate} | วันที่: ${item.deliveryDate || item.reportDate}`;
                if (title === 'พาเลททั้งหมด') {
                    detailText = `พาเลท: ${item.palletNumbers.join(', ')}`;
                } else if (title === 'คงค้าง (ล่าช้า)') {
                    const tDate = parseThaiDate(item.deliveryDate);
                    if (tDate) {
                        const dueDate = calculateDueDate(tDate);
                        const overdueDays = Math.floor((new Date() - dueDate) / (1000 * 60 * 60 * 24));
                        if (overdueDays > 0) {
                            detailText += `<span class="text-red-600 font-bold ml-2">(ล่าช้า ${overdueDays} วัน)</span>`;
                        }
                    }
                }
                return `<div class="p-2 border-b hover:bg-gray-100 cursor-pointer stats-detail-item" data-id="${transferId}">
                            <p>TFOR: ...${item.tforNumber} | ${item.branch}</p>
                            <p class="text-sm text-gray-600">${detailText}</p>
                        </div>`;
            }).join('');
        }
        const modalHtml = `
            <h3 class="text-xl font-bold mb-4">${title}</h3>
            <div class="space-y-2 max-h-72 overflow-y-auto">${listHtml}</div>
        `;
        showDetailsModal(modalHtml, true);
    }
    
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('bg-fuchsia-600', 'text-white'));
            e.target.classList.add('bg-fuchsia-600', 'text-white');
            renderAdvancedStatistics(e.target.dataset.frame);
        });
    });
    
    // --- NEW/IMPROVED EXPORT LOGIC ---
    
    async function generateAndExportPdf() {
        const button = document.getElementById('export-pdf-btn');
        button.disabled = true;
        button.innerHTML = `<div class="loading-spinner w-5 h-5 border-white border-t-transparent rounded-full inline-block mr-2"></div> กำลังสร้าง...`;
        
        const timeframe = document.querySelector('.timeframe-btn.bg-fuchsia-600').dataset.frame;
        const stats = getStatsData(timeframe);
        const reportTitle = document.getElementById('report-title').textContent;
        const exportContent = document.getElementById('pdf-export-content');
        
        const branchChartImg = currentChartInstances.branchChart ? currentChartInstances.branchChart.toBase64Image() : '';
        const statusChartImg = currentChartInstances.statusChart ? currentChartInstances.statusChart.toBase64Image() : '';
        
        let html = `<!DOCTYPE html>
        <html>
        <head>
            <title>${reportTitle}</title>
            <meta charset="utf-8">
            <style>
                body {
                    font-family: 'Sarabun', sans-serif;
                    color: #333;
                    margin: 0;
                    padding: 20px;
                    font-size: 14px;
                }
                h1 { 
                    font-size: 24px; 
                    font-weight: bold; 
                    margin-bottom: 16px; 
                    text-align: center;
                    color: #4f46e5;
                }
                h2 { 
                    font-size: 18px; 
                    font-weight: bold; 
                    margin-top: 24px; 
                    margin-bottom: 12px; 
                    border-bottom: 1px solid #ccc; 
                    padding-bottom: 4px;
                    color: #4f46e5;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    font-size: 12px;
                    margin-bottom: 20px;
                }
                th, td { 
                    border: 1px solid #ddd; 
                    padding: 8px; 
                    text-align: left;
                }
                th { 
                    background-color: #f2f2f2;
                    font-weight: bold;
                }
                .chart-image { 
                    max-width: 90%; 
                    height: auto; 
                    display: block; 
                    margin: 20px auto;
                }
                .page-break { 
                    page-break-before: always;
                }
                .summary-card {
                    background-color: #f9fafb;
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 16px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .summary-card h3 {
                    margin-top: 0;
                    margin-bottom: 8px;
                    font-size: 16px;
                }
                .summary-card p {
                    margin: 0;
                    font-size: 14px;
                }
                .summary-value {
                    font-size: 20px;
                    font-weight: bold;
                    color: #4f46e5;
                }
                .summary-cards-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    margin-bottom: 24px;
                }
                table tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
                .table-container {
                    overflow-x: auto;
                    margin-bottom: 20px;
                }
            </style>
        </head>
        <body>
            <h1>${reportTitle}</h1>
            
            <div class="summary-cards-grid">
                <div class="summary-card">
                    <h3>ของเข้าทั้งหมด (TFORs)</h3>
                    <p class="summary-value">${stats.totalInbound}</p>
                </div>
                <div class="summary-card">
                    <h3>เช็คเสร็จแล้ว</h3>
                    <p class="summary-value">${stats.totalCompleted}</p>
                </div>
                <div class="summary-card">
                    <h3>รับสินค้าแล้ว</h3>
                    <p class="summary-value">${stats.totalReceived}</p>
                </div>
                <div class="summary-card">
                    <h3>คงค้าง (ล่าช้า)</h3>
                    <p class="summary-value">${stats.totalOverdue}</p>
                </div>
                <div class="summary-card" style="grid-column: span 2;">
                    <h3>พาเลททั้งหมด</h3>
                    <p class="summary-value">${stats.totalPallets}</p>
                </div>
                <div class="summary-card" style="grid-column: span 2;">
                    <h3>สินค้ามีปัญหา</h3>
                    <p class="summary-value">${stats.totalIssues}</p>
                </div>
            </div>
            
            <h2>กราฟสรุปผล</h2>
            <div style="display: flex; flex-wrap: wrap; justify-content: space-between; margin-bottom: 24px;">
                <div style="width: 48%; margin-bottom: 16px;">
                    <img src="${branchChartImg}" class="chart-image">
                </div>
                <div style="width: 48%; margin-bottom: 16px;">
                    <img src="${statusChartImg}" class="chart-image">
                </div>
            </div>
            <div class="page-break"></div>
            
            <h2>รายละเอียดข้อมูล TFORs</h2>
            <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>วันที่มาถึง</th><th>ทะเบียนรถ</th><th>TFOR</th><th>สาขาต้นทาง</th>
                        <th>จำนวนพาเลท</th><th>สถานะ</th><th>วันที่เช็คเสร็จ</th><th>ผู้เช็ค</th>
                        <th>หมายเหตุ</th>
                    </tr>
                </thead>
                <tbody>
                    ${stats.filteredData.map(d => `
                        <tr>
                            <td>${d.deliveryDate || 'N/A'}</td>
                            <td>${d.licensePlate || 'N/A'}</td>
                            <td>...${d.tforNumber || 'N/A'}</td>
                            <td>${d.branch || 'N/A'}</td>
                            <td>${d.palletCount || 0}</td>
                            <td>${d.isCompleted ? 'เช็คเสร็จแล้ว' : 'รอดำเนินการ'}</td>
                            <td>${d.completionDate || '-'}</td>
                            <td>${d.lastCheckedByName || '-'}</td>
                            <td>${d.palletNotes || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            </div>
        </body>
        </html>`;
        
        exportContent.innerHTML = html;
        
        const opt = {
            margin: 10,
            filename: `inbound_report_${timeframe}_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                logging: false,
                letterRendering: true
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait'
            }
        };
        
        try {
            await html2pdf().from(exportContent).set(opt).save();
            showNotification('ส่งออก PDF สำเร็จแล้ว');
        } catch (error) {
            console.error('PDF export error:', error);
            showNotification('เกิดข้อผิดพลาดในการส่งออก PDF: ' + error.message, false);
        } finally {
            button.disabled = false;
            button.innerHTML = `<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>Export PDF`;
        }
    }
    
    function exportToCsv() {
        const button = document.getElementById('export-excel-btn');
        button.disabled = true;
        button.innerHTML = `<div class="loading-spinner w-5 h-5 border-white border-t-transparent rounded-full inline-block mr-2"></div> กำลังสร้าง...`;
        const timeframe = document.querySelector('.timeframe-btn.bg-fuchsia-600').dataset.frame;
        const { filteredData } = getStatsData(timeframe);
        const headers = ["วันที่มาถึง", "ทะเบียนรถ", "TFOR", "สาขาต้นทาง", "จำนวนพาเลท", "สถานะ", "วันที่เช็คเสร็จ", "ผู้เช็คล่าสุด", "ผู้นำเข้าข้อมูล", "หมายเหตุ"];
        const rows = filteredData.map(row => [
            row.deliveryDate || '',
            row.licensePlate || '',
            `...${row.tforNumber || ''}`,
            row.branch || '',
            row.palletCount || 0,
            row.isCompleted ? 'เช็คเสร็จแล้ว' : 'รอดำเนินการ',
            row.completionDate || '',
            row.lastCheckedByName || '',
            row.createdByName || '',
            row.palletNotes || ''
        ]);
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF" // \uFEFF for BOM to handle Thai characters in Excel
            + headers.join(",") + "\n" 
            + rows.map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `inbound_data_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        button.disabled = false;
        button.innerHTML = `<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>Export Excel`;
    }
    
    document.getElementById('export-pdf-btn').addEventListener('click', generateAndExportPdf);
    document.getElementById('export-excel-btn').addEventListener('click', exportToCsv);
    
    function formatDateAbbreviated(dateString) {
        const date = parseThaiDate(dateString);
        if (!date) return dateString;
        const day = date.getDate();
        const month = thaiMonths[date.getMonth()].substring(0, 3);
        const year = (date.getFullYear() + 543).toString().slice(-2);
        return `${day} ${month} ${year}`;
    }
    
    function showConfirmationModal(message, onConfirm) {
        confirmationMessage.textContent = message;
        confirmCallback = onConfirm;
        confirmationModal.classList.remove('hidden');
        confirmationModal.classList.add('flex');
    }
    
    confirmCancelBtn.addEventListener('click', () => {
        confirmationModal.classList.add('hidden');
        confirmationModal.classList.remove('flex');
        confirmCallback = null;
    });
    
    confirmOkBtn.addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        confirmationModal.classList.add('hidden');
        confirmationModal.classList.remove('flex');
        confirmCallback = null;
    });
    
    // --- KPI View Logic ---
    function renderKpiView() {
        const summaryContainer = document.getElementById('kpi-summary-container');
        const detailsContainer = document.getElementById('kpi-details-container');
        summaryContainer.innerHTML = '';
        detailsContainer.classList.add('hidden');
        const allIssues = Object.values(issuesData).flat();
        
        allUsers.forEach(user => {
            if (user.role === 'Admin') return; // Don't show admin in KPI list
            const createdCount = [...allTransfersData, ...completedTransfersData].filter(t => t.createdByUid === user.id).length;
            const checkedCount = completedTransfersData.filter(t => t.lastCheckedByUid === user.id).length;
            const receivedCount = completedTransfersData.filter(t => t.lastReceivedByUid === user.id).length;
            
            // Count issues reported by this user
            const reportedIssuesCount = allIssues.filter(i => i.reportedByUid === user.id).length;
            
            // Count issues found by this user (where they were the checker)
            const foundIssuesCount = allIssues.filter(i => i.checkerUid === user.id).length;
            
            const userScores = allScores.filter(s => s.userId === user.id);
            const totalStars = userScores.reduce((sum, score) => sum + (score.score || 0), 0);
            const profilePic = user.profilePictureUrl || 'https://placehold.co/80x80/e0e0e0/757575?text=?';
            
            // KPI Calculation: Checked + Created + Found Issues + Reported Issues + Received + Stars
            const kpiScore = checkedCount + createdCount + foundIssuesCount + reportedIssuesCount + receivedCount + totalStars;
            const scoreColor = kpiScore > 10 ? 'text-green-500' : kpiScore > 0 ? 'text-blue-500' : 'text-red-500';
            const card = document.createElement('div');
            card.className = 'bg-white p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-shadow';
            card.innerHTML = `
                <div class="flex items-center space-x-4">
                    <img src="${profilePic}" alt="Profile" class="w-16 h-16 rounded-full object-cover">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800">${user.firstName} ${user.lastName}</h3>
                        <p class="text-sm text-gray-500">${user.role || 'Officer'}</p>
                    </div>
                </div>
                <div class="mt-4 flex justify-between items-center">
                    <div>
                        <p class="text-xs font-semibold text-gray-500">คะแนนประสิทธิภาพ</p>
                        <p class="text-3xl font-bold ${scoreColor}">${kpiScore}</p>
                    </div>
                    <div class="grid grid-cols-4 gap-2 text-center text-xs">
                        <div><p class="font-bold text-blue-500">${createdCount}</p><p>สร้าง</p></div>
                        <div><p class="font-bold text-green-500">${checkedCount}</p><p>เช็ค</p></div>
                        <div><p class="font-bold text-purple-500">${receivedCount}</p><p>รับ</p></div>
                        <div><p class="font-bold text-red-500">${reportedIssuesCount}</p><p>รายงาน</p></div>
                    </div>
                </div>
                <div class="mt-2 text-center text-sm text-gray-600">
                    <p>พบปัญหา: ${foundIssuesCount} รายการ</p>
                </div>
                <div class="mt-4 admin-supervisor-only">
                    <button class="give-star-points-btn w-full py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200" data-user-id="${user.id}">
                        <span class="small-star">★</span> ให้คะแนนดาว
                    </button>
                </div>
            `;
            card.addEventListener('click', () => renderKpiDetails(user));
            summaryContainer.appendChild(card);
        });
        renderUserManagement();
        
        // Add event listeners to star points buttons
        document.querySelectorAll('.give-star-points-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                showStarPointsModal(e.target.dataset.userId);
            });
        });
    }
    
    function renderUserManagement() {
        const container = document.getElementById('user-list-container');
        container.innerHTML = '';
        const table = document.createElement('table');
        table.className = 'min-w-full bg-white';
        table.innerHTML = `
            <thead class="bg-gray-50"><tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่อ-นามสกุล</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">อีเมล</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ตำแหน่ง</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase admin-only">จัดการ</th>
            </tr></thead>
            <tbody class="divide-y divide-gray-200"></tbody>`;
        const tbody = table.querySelector('tbody');
        allUsers.forEach(user => {
            if (user.role === 'Admin') return;
            const row = tbody.insertRow();
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">${user.firstName} ${user.lastName}</td>
                <td class="px-6 py-4 whitespace-nowrap">${user.email}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <select class="role-select rounded-md border-gray-300" data-uid="${user.id}">
                        <option value="Supervisor" ${user.role === 'Supervisor' ? 'selected' : ''}>Supervisor</option>
                        <option value="Senior" ${user.role === 'Senior' ? 'selected' : ''}>Senior</option>
                        <option value="Officer" ${!user.role || user.role === 'Officer' ? 'selected' : ''}>Officer</option>
                        <option value="Viewer" ${user.role === 'Viewer' ? 'selected' : ''}>Viewer</option>
                    </select>
                </td>
                <td class="px-6 py-4 whitespace-nowrap admin-only">
                    <button class="delete-user-btn text-red-500 hover:text-red-700" data-uid="${user.uid}" data-email="${user.email}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </td>
            </tr>
            `;
        });
        container.appendChild(table);
        
        // Add event listeners for role selection
        document.querySelectorAll('.role-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const newRole = e.target.value;
                const uid = e.target.dataset.uid;
                try {
                    await updateDoc(doc(db, "users", uid), { role: newRole });
                    showNotification('อัปเดตตำแหน่งสำเร็จ');
                } catch (error) {
                    showNotification('เกิดข้อผิดพลาด', false);
                }
            });
        });
        
        // Add event listeners for delete buttons
        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const uid = e.currentTarget.dataset.uid;
                const email = e.currentTarget.dataset.email;
                showDeleteUserConfirmation(uid, email);
            });
        });
        
        // Update UI for roles
        updateUIForRoles();
    }
    
    function showDeleteUserConfirmation(uid, email) {
        showConfirmationModal(
            `คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน "${email}"? การกระทำนี้ไม่สามารถกู้คืนได้`,
            () => deleteUser(uid)
        );
    }
    
    async function deleteUser(uid) {
        try {
            // Delete the user document from Firestore
            await deleteDoc(doc(db, "users", uid));
            
            // Remove the user from the local allUsers array
            allUsers = allUsers.filter(user => user.id !== uid);
            
            // Re-render the KPI view to update the user list
            renderKpiView();
            
            showNotification("ลบผู้ใช้งานสำเร็จ");
        } catch (error) {
            console.error("Error deleting user:", error);
            showNotification("เกิดข้อผิดพลาดในการลบผู้ใช้งาน", false);
        }
    }
    
    function getMillis(timestamp) {
        if (!timestamp) return 0;
        if (typeof timestamp.toMillis === 'function') {
            return timestamp.toMillis();
        }
        if (typeof timestamp === 'string') {
            return new Date(timestamp).getTime();
        }
        if (timestamp.seconds) {
            return timestamp.seconds * 1000;
        }
        return 0;
    }
    
    function renderKpiDetails(user) {
        const container = document.getElementById('kpi-details-container');
        container.dataset.userId = user.id;
        const userScores = allScores.filter(s => s.userId === user.id).sort((a, b) => getMillis(b.timestamp) - getMillis(a.timestamp));
        const totalStars = userScores.reduce((sum, score) => sum + (score.score || 0), 0);
        const blackStarsCount = userScores.filter(s => s.score < 0).reduce((sum, s) => sum + Math.abs(s.score), 0);
        const profilePic = user.profilePictureUrl || 'https://placehold.co/128x128/e0e0e0/757575?text=?';
        const allUserTransfers = [...allTransfersData, ...completedTransfersData];
        const createdCount = allUserTransfers.filter(t => t.createdByUid === user.id).length;
        const checkedCount = completedTransfersData.filter(t => t.lastCheckedByUid === user.id).length;
        const receivedCount = completedTransfersData.filter(t => t.lastReceivedByUid === user.id).length;
        
        // Count issues reported by this user
        const allIssues = Object.values(issuesData).flat();
        const reportedIssuesCount = allIssues.filter(i => i.reportedByUid === user.id).length;
        
        // Count issues found by this user (where they were the checker)
        const foundIssuesCount = allIssues.filter(i => i.checkerUid === user.id).length;
        
        const performanceScore = checkedCount + createdCount + foundIssuesCount + reportedIssuesCount + receivedCount + totalStars;
        const issueRate = checkedCount > 0 ? ((reportedIssuesCount / checkedCount) * 100).toFixed(1) : 0;
        let scoreHistoryHtml = '<p class="text-gray-500">ยังไม่มีประวัติคะแนนพิเศษ</p>';
        if (userScores.length > 0) {
            scoreHistoryHtml = userScores.map(score => {
                const scoreDate = score.timestamp ? new Date(getMillis(score.timestamp)).toLocaleDateString('th-TH') : 'ไม่มีข้อมูลวันที่';
                const starColor = score.score < 0 ? 'text-red-500' : 'text-amber-500';
                const stars = '★'.repeat(Math.abs(score.score));
                
                return `
                <div class="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <div>
                        <p class="font-semibold">${score.reason} <span class="${starColor}">${stars}</span></p>
                        <p class="text-xs text-gray-500">โดย: ${score.awardedByName} - ${scoreDate}</p>
                        ${score.notes ? `<p class="text-sm text-gray-600 italic mt-1">"${score.notes}"</p>` : ''}
                    </div>
                    <div class="admin-supervisor-only">
                        <button class="delete-score-btn text-red-400 hover:text-red-600" data-score-id="${score.id}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>
            `}).join('');
        }
        container.innerHTML = `
            <button id="back-to-kpi-summary" class="mb-6 px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700">← กลับไปที่สรุป</button>
            <div class="flex flex-col sm:flex-row items-center justify-between mb-6">
                <div class="flex items-center space-x-4">
                    <img src="${profilePic}" alt="Profile" class="w-24 h-24 rounded-full object-cover shadow-md">
                    <div>
                        <h2 class="text-2xl font-bold">${user.firstName} ${user.lastName}</h2>
                        <p class="text-lg font-bold">
                            <span class="text-amber-500">คะแนนรวม: ${totalStars} ★</span>
                            ${blackStarsCount > 0 ? `<span class="text-red-500 ml-2">(หัก ${blackStarsCount} ★)</span>` : ''}
                        </p>
                    </div>
                </div>
                <div class="admin-supervisor-only mt-4 sm:mt-0 flex gap-2">
                    <button id="add-score-btn" data-user-id="${user.id}" class="px-4 py-2 bg-fuchsia-600 text-white rounded-lg shadow hover:bg-fuchsia-700">ให้คะแนนพิเศษ</button>
                    <button id="add-star-points-btn" data-user-id="${user.id}" class="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg shadow hover:bg-yellow-200">
                        <span class="small-star">★</span> ให้คะแนนดาว
                    </button>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                     <h3 class="text-xl font-semibold mb-4">ประวัติคะแนน</h3>
                     <div class="space-y-3 max-h-60 overflow-y-auto">${scoreHistoryHtml}</div>
                </div>
                <div>
                    <h3 class="text-xl font-semibold mb-4">กราฟสรุปผลงาน</h3>
                    <div class="relative h-60"><canvas id="kpi-user-chart"></canvas></div>
                </div>
            </div>
            <div class="mt-6 bg-gray-50 p-4 rounded-lg">
                <h3 class="text-lg font-semibold mb-2">รายละเอียดคะแนน KPI</h3>
                <div class="grid grid-cols-2 gap-4">
                    <div><p class="text-sm text-gray-600">สร้าง TFOR</p><p class="text-xl font-bold">${createdCount} คะแนน</p></div>
                    <div><p class="text-sm text-gray-600">เช็คสินค้า</p><p class="text-xl font-bold">${checkedCount} คะแนน</p></div>
                    <div><p class="text-sm text-gray-600">พบปัญหา</p><p class="text-xl font-bold">${foundIssuesCount} คะแนน</p></div>
                    <div><p class="text-sm text-gray-600">รายงานปัญหา</p><p class="text-xl font-bold">${reportedIssuesCount} คะแนน</p></div>
                    <div><p class="text-sm text-gray-600">รับสินค้า</p><p class="text-xl font-bold">${receivedCount} คะแนน</p></div>
                    <div><p class="text-sm text-gray-600">คะแนนพิเศษ</p><p class="text-xl font-bold">${totalStars} คะแนน</p></div>
                </div>
                <div class="mt-4 text-center">
                    <p class="text-2xl font-bold text-purple-600">คะแนนรวม: ${performanceScore}</p>
                </div>
            </div>
        `;
        container.classList.remove('hidden');
        const kpiCtx = document.getElementById('kpi-user-chart').getContext('2d');
        currentChartInstances.kpiChart = new Chart(kpiCtx, {
            type: 'bar',
            data: {
                labels: ['สร้าง TFOR', 'เช็คเสร็จ', 'รับสินค้า', 'พบปัญหา', 'รายงานปัญหา'],
                datasets: [{
                    label: 'จำนวนรายการ',
                    data: [createdCount, checkedCount, receivedCount, foundIssuesCount, reportedIssuesCount],
                    backgroundColor: ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444']
                }]
            },
            options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, responsive: true, maintainAspectRatio: false }
        });
        updateUIForRoles(); // Ensure delete buttons are visible for the right roles
        document.getElementById('back-to-kpi-summary').addEventListener('click', () => {
            container.classList.add('hidden');
            if(currentChartInstances.kpiChart) currentChartInstances.kpiChart.destroy();
        });
        document.getElementById('add-score-btn').addEventListener('click', (e) => {
            showScoreModal(e.target.dataset.userId);
        });
        document.getElementById('add-star-points-btn').addEventListener('click', (e) => {
            showStarPointsModal(e.target.dataset.userId);
        });
        container.querySelectorAll('.delete-score-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scoreId = e.currentTarget.dataset.scoreId;
                showConfirmationModal('คุณแน่ใจหรือไม่ว่าต้องการลบคะแนนนี้?', () => deleteScore(scoreId));
            });
        });
    }
    
    async function deleteScore(scoreId) {
        try {
            await deleteDoc(doc(db, "scores", scoreId));
            showNotification("ลบคะแนนสำเร็จ");
        } catch (error) {
            showNotification("เกิดข้อผิดพลาดในการลบคะแนน", false);
            console.error("Error deleting score:", error);
        }
    }
    
    function showScoreModal(userId) {
        scoreForm.reset();
        scoreForm.querySelector('#score-user-id').value = userId;
        scoreForm.querySelector('#score-value').value = '';
        const starRatingDiv = scoreForm.querySelector('#score-star-rating');
        starRatingDiv.classList.remove('deduction');
        starRatingDiv.querySelectorAll('.star').forEach(s => s.classList.remove('selected'));
        scoreModal.classList.remove('hidden');
        scoreModal.classList.add('flex');
    }
    
    // Star Points Modal Functions
    function showStarPointsModal(userId) {
        const user = allUsers.find(u => u.id === userId);
        if (!user) return;
        
        // Get current star counts
        const smallStars = user.smallStars || 0;
        const bigStars = user.bigStars || 0;
        
        // Update modal display
        document.getElementById('current-small-stars').textContent = smallStars;
        document.getElementById('current-big-stars').textContent = bigStars;
        
        // Update progress bar
        const progressPercent = (smallStars % 10) * 10; // 10% per star
        document.getElementById('star-progress-bar').style.width = `${progressPercent}%`;
        
        // Store user ID for saving
        starPointsModal.dataset.userId = userId;
        
        // Reset form
        document.getElementById('star-reason').value = 'ทำงานรวดเร็วและมีประสิทธิภาพ';
        document.getElementById('star-notes').value = '';
        
        starPointsModal.classList.remove('hidden');
        starPointsModal.classList.add('flex');
    }
    
    document.getElementById('star-modal-cancel').addEventListener('click', () => {
        starPointsModal.classList.add('hidden');
        starPointsModal.classList.remove('flex');
    });
    
    document.getElementById('add-star-btn').addEventListener('click', () => {
        const currentSmallStars = parseInt(document.getElementById('current-small-stars').textContent);
        document.getElementById('current-small-stars').textContent = currentSmallStars + 1;
        updateStarProgress();
    });
    
    document.getElementById('deduct-star-btn').addEventListener('click', () => {
        const currentSmallStars = parseInt(document.getElementById('current-small-stars').textContent);
        if (currentSmallStars > 0) {
            document.getElementById('current-small-stars').textContent = currentSmallStars - 1;
            updateStarProgress();
        }
    });
    
    function updateStarProgress() {
        const smallStars = parseInt(document.getElementById('current-small-stars').textContent);
        const bigStars = parseInt(document.getElementById('current-big-stars').textContent);
        
        // Update progress bar
        const progressPercent = (smallStars % 10) * 10; // 10% per star
        document.getElementById('star-progress-bar').style.width = `${progressPercent}%`;
        
        // Check if user earned a big star
        if (smallStars >= 10) {
            const newBigStars = bigStars + Math.floor(smallStars / 10);
            const remainingSmallStars = smallStars % 10;
            
            document.getElementById('current-small-stars').textContent = remainingSmallStars;
            document.getElementById('current-big-stars').textContent = newBigStars;
            
            showNotification('ยินดีด้วย! คุณได้รับดาวใหญ่ 1 ดวง!');
        }
    }
    
    document.getElementById('save-star-points').addEventListener('click', async () => {
        const userId = starPointsModal.dataset.userId;
        const smallStars = parseInt(document.getElementById('current-small-stars').textContent);
        const bigStars = parseInt(document.getElementById('current-big-stars').textContent);
        const reason = document.getElementById('star-reason').value;
        const notes = document.getElementById('star-notes').value;
        
        try {
            // Update user's star counts
            await updateDoc(doc(db, "users", userId), {
                smallStars: smallStars,
                bigStars: bigStars
            });
            
            // Save star points transaction
            await addDoc(collection(db, "starPoints"), {
                userId: userId,
                smallStars: smallStars,
                bigStars: bigStars,
                reason: reason,
                notes: notes,
                awardedByUid: currentUser.uid,
                awardedByName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`,
                timestamp: serverTimestamp()
            });
            
            // Update local user data
            const userIndex = allUsers.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                allUsers[userIndex].smallStars = smallStars;
                allUsers[userIndex].bigStars = bigStars;
            }
            
            showNotification('บันทึกคะแนนดาวสำเร็จ!');
            starPointsModal.classList.add('hidden');
            starPointsModal.classList.remove('flex');
            
            // If we're in profile view, update the display
            if (views.profile.style.display === 'block' && currentUser.id === userId) {
                renderProfileStarPoints();
            }
        } catch (error) {
            showNotification('เกิดข้อผิดพลาด', false);
            console.error("Error saving star points:", error);
        }
    });
    
    document.getElementById('score-modal-cancel').addEventListener('click', () => {
        scoreModal.classList.add('hidden');
        scoreModal.classList.remove('flex');
    });
    
    document.getElementById('score-reason').addEventListener('change', (e) => {
        const starRatingDiv = document.getElementById('score-star-rating');
        if (e.target.value === 'ทำงานผิดพลาด (หักคะแนน)') {
            starRatingDiv.classList.add('deduction');
        } else {
            starRatingDiv.classList.remove('deduction');
        }
    });
    
    const stars = document.querySelectorAll('#score-star-rating .star');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const value = star.dataset.value;
            scoreForm.querySelector('#score-value').value = value;
            stars.forEach(s => {
                s.classList.toggle('selected', s.dataset.value <= value);
            });
        });
    });
    
    scoreForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        let scoreValue = parseInt(scoreForm.querySelector('#score-value').value);
        const reason = scoreForm.querySelector('#score-reason').value;
        if (reason === 'ทำงานผิดพลาด (หักคะแนน)') {
            scoreValue = -scoreValue;
        }
        const scoreData = {
            userId: scoreForm.querySelector('#score-user-id').value,
            score: scoreValue,
            reason: reason,
            notes: scoreForm.querySelector('#score-notes').value,
            awardedByUid: currentUser.uid,
            awardedByName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`,
            timestamp: serverTimestamp()
        };
        if (!scoreData.score || isNaN(scoreValue)) {
            showNotification('กรุณาให้คะแนนดาว', false); return;
        }
        try {
            await addDoc(collection(db, "scores"), scoreData);
            showNotification('บันทึกคะแนนสำเร็จ!');
            scoreModal.classList.add('hidden');
            scoreModal.classList.remove('flex');
        } catch (error) {
            showNotification('เกิดข้อผิดพลาด', false);
            console.error("Error saving score:", error);
        }
    });
    
    // --- Profile View Logic ---
    function renderProfileView() {
        if (currentUserProfile) {
            profileForm.querySelector('#profile-email').value = currentUserProfile.email;
            profileForm.querySelector('#profile-role').value = currentUserProfile.role || 'Officer';
            profileForm.querySelector('#profile-firstname').value = currentUserProfile.firstName;
            profileForm.querySelector('#profile-lastname').value = currentUserProfile.lastName;
            profilePicPreview.src = currentUserProfile.profilePictureUrl || 'https://placehold.co/128x128/e0e0e0/757575?text=รูป';
            newProfilePicBase64 = null;
            renderDefaultAvatars();
            renderRecentActivity();
            renderProfileScores();
            renderProfileStarPoints();
        }
    }
    
    function renderProfileStarPoints() {
        if (!currentUserProfile) return;
        
        const smallStars = currentUserProfile.smallStars || 0;
        const bigStars = currentUserProfile.bigStars || 0;
        
        // Update star display
        document.getElementById('user-small-stars').textContent = smallStars;
        document.getElementById('user-big-stars').textContent = bigStars;
        
        // Update progress bar
        const progressPercent = (smallStars % 10) * 10; // 10% per star
        document.getElementById('star-progress-bar').style.width = `${progressPercent}%`;
        
        // Render achievement badges
        const achievementsContainer = document.getElementById('user-achievements');
        achievementsContainer.innerHTML = '';
        
        // Add big star achievement badges
        for (let i = 0; i < bigStars; i++) {
            const badge = document.createElement('div');
            badge.className = 'achievement-badge';
            badge.innerHTML = `<span class="big-star">★</span> ดาวใหญ่`;
            achievementsContainer.appendChild(badge);
        }
        
        // Add next big star progress if user has some small stars but not enough for a big star
        if (smallStars > 0 && smallStars < 10) {
            const badge = document.createElement('div');
            badge.className = 'achievement-badge opacity-50';
            badge.innerHTML = `<span class="big-star" style="color: #d1d5db;">★</span> ดาวใหญ่ (${smallStars}/10)`;
            achievementsContainer.appendChild(badge);
        }
    }
    
    function renderDefaultAvatars() {
        defaultAvatarContainer.innerHTML = '';
        const avatars = [
            'https://avatar.iran.liara.run/public/boy?username=Scott',
            'https://avatar.iran.liara.run/public/girl?username=Amy',
            'https://avatar.iran.liara.run/public/boy?username=James',
            'https://avatar.iran.liara.run/public/girl?username=Sara',
            'https://avatar.iran.liara.run/public/boy?username=Tom',
            'https://avatar.iran.liara.run/public/girl?username=Nia'
        ];
        avatars.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            img.className = 'w-16 h-16 rounded-full default-avatar';
            img.dataset.url = url;
            defaultAvatarContainer.appendChild(img);
        });
    }
    
    defaultAvatarContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('default-avatar')) {
            const url = e.target.dataset.url;
            profilePicPreview.src = url;
            newProfilePicBase64 = url; // Use the same variable to store the selected URL
            
            // Visually indicate selection
            document.querySelectorAll('.default-avatar').forEach(el => el.classList.remove('selected'));
            e.target.classList.add('selected');
        }
    });
    
    profilePicUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            try {
                const resizedBase64 = await resizeImage(file, 400, 400, 0.9); // Smaller size for profile pics
                newProfilePicBase64 = resizedBase64;
                profilePicPreview.src = resizedBase64;
                document.querySelectorAll('.default-avatar').forEach(el => el.classList.remove('selected'));
            } catch (error) {
                console.error("Profile image resizing failed:", error);
                showNotification("เกิดข้อผิดพลาดในการปรับขนาดรูปโปรไฟล์", false);
            }
        }
    });
    
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = e.target.querySelector('button[type="submit"]');
        button.disabled = true;
        button.innerHTML = `<div class="loading-spinner w-5 h-5 border-white border-t-transparent rounded-full mx-auto"></div>`;
        const updateData = {
            firstName: profileForm.querySelector('#profile-firstname').value,
            lastName: profileForm.querySelector('#profile-lastname').value
        };
        if (newProfilePicBase64) {
            updateData.profilePictureUrl = newProfilePicBase64;
        }
        try {
            const userDocRef = doc(db, "users", currentUser.uid);
            await updateDoc(userDocRef, updateData);
            
            // Update local profile object
            Object.assign(currentUserProfile, updateData);
            updateUserDisplays(currentUserProfile);
            showNotification('อัปเดตโปรไฟล์สำเร็จ!');
            showMainView(views.mainMenu);
        } catch (error) {
            showNotification('เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์', false);
            console.error("Profile update error:", error);
        } finally {
            button.disabled = false;
            button.textContent = 'บันทึกการเปลี่ยนแปลง';
        }
    });
    
    function renderRecentActivity() {
        const container = document.getElementById('recent-activity-container');
        const allUserTransfers = [...allTransfersData, ...completedTransfersData];
        const allUserIssues = Object.values(issuesData).flat();
        
        const createdActivity = allUserTransfers
            .filter(t => t.createdByUid === currentUser.uid)
            .map(t => ({...t, type: 'สร้าง', timestamp: t.createdAt}));
        
        const checkedActivity = completedTransfersData
            .filter(t => t.lastCheckedByUid === currentUser.uid)
            .map(t => ({...t, type: 'เช็คเสร็จ', timestamp: t.createdAt})); // Note: using createdAt for sorting consistency
        const receivedActivity = completedTransfersData
            .filter(t => t.lastReceivedByUid === currentUser.uid)
            .map(t => ({...t, type: 'รับสินค้า', timestamp: t.createdAt}));
        const issueActivity = allUserIssues
            .filter(i => i.reportedByUid === currentUser.uid)
            .map(i => ({...i, type: 'รายงานปัญหา', timestamp: i.createdAt}));
        const foundIssueActivity = allUserIssues
            .filter(i => i.checkerUid === currentUser.uid)
            .map(i => ({...i, type: 'พบปัญหา', timestamp: i.createdAt}));
        const userActivity = [...createdActivity, ...checkedActivity, ...receivedActivity, ...issueActivity, ...foundIssueActivity]
            .sort((a, b) => getMillis(b.timestamp) - getMillis(a.timestamp))
            .slice(0, 5);
        if (userActivity.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center">ไม่มีกิจกรรมล่าสุด</p>';
            return;
        }
        container.innerHTML = userActivity.map(item => {
            let actionText = '';
            let actionColor = '';
            if (item.type === 'เช็คเสร็จ') {
                actionText = 'คุณเช็ค TFOR นี้เสร็จแล้ว';
                actionColor = 'text-green-600';
            } else if (item.type === 'รับสินค้า') {
                actionText = 'คุณรับสินค้า TFOR นี้เสร็จแล้ว';
                actionColor = 'text-purple-600';
            } else if (item.type === 'สร้าง') {
                actionText = 'คุณสร้าง TFOR นี้';
                actionColor = 'text-blue-600';
            } else if (item.type === 'รายงานปัญหา') {
                actionText = 'คุณรายงานปัญหา';
                actionColor = 'text-red-600';
            } else if (item.type === 'พบปัญหา') {
                actionText = 'คุณพบปัญหาใน TFOR นี้';
                actionColor = 'text-yellow-600';
            }
            return `
                <div class="p-3 bg-gray-50 rounded-lg">
                    <p class="font-semibold">TFOR: ...${item.tforNumber} (${item.branch})</p>
                    <p class="text-sm ${actionColor}">${actionText} - ${formatDateAbbreviated(item.deliveryDate || item.reportDate)}</p>
                </div>
            `;
        }).join('');
    }
    
    function renderProfileScores() {
        const container = document.getElementById('profile-scores-container');
        if (!container) return;
        const userScores = allScores.filter(s => s.userId === currentUser.uid).sort((a, b) => getMillis(b.timestamp) - getMillis(a.timestamp));
        if (userScores.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center">ยังไม่มีการประเมินจากหัวหน้า</p>';
            return;
        }
        container.innerHTML = userScores.map(score => {
            const scoreDate = score.timestamp ? new Date(getMillis(score.timestamp)).toLocaleDateString('th-TH') : 'ไม่มีข้อมูลวันที่';
            const starColor = score.score < 0 ? 'text-red-500' : 'text-amber-500';
            const stars = '★'.repeat(Math.abs(score.score));
            const awardedBy = allUsers.find(u => u.id === score.awardedByUid);
            const awardedByName = awardedBy ? `${awardedBy.firstName} ${awardedBy.lastName}` : 'N/A';
            
            return `
                <div class="p-3 bg-gray-50 rounded-lg">
                    <p class="font-semibold">${score.reason} <span class="${starColor}">${stars}</span></p>
                    <p class="text-xs text-gray-500">โดย: ${awardedByName} - ${scoreDate}</p>
                    ${score.notes ? `<p class="text-sm text-gray-600 italic mt-1">"${score.notes}"</p>` : ''}
                </div>
            `;
        }).join('');
    }
    
    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = changePasswordForm.querySelector('#current-password').value;
        const newPassword = changePasswordForm.querySelector('#new-password').value;
        const confirmPassword = changePasswordForm.querySelector('#confirm-password').value;
        if (newPassword !== confirmPassword) {
            showNotification('รหัสผ่านใหม่ไม่ตรงกัน', false);
            return;
        }
        if (newPassword.length < 6) {
            showNotification('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร', false);
            return;
        }
        try {
            const user = auth.currentUser;
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            changePasswordForm.reset();
            showNotification('เปลี่ยนรหัสผ่านสำเร็จแล้ว!');
        } catch (error) {
            showNotification('เปลี่ยนรหัสผ่านไม่สำเร็จ: ' + error.message, false);
            console.error("Password change error:", error);
        }
    });
    
    async function deleteAllInboundData() {
        const button = document.getElementById('delete-all-data-btn');
        button.disabled = true;
        button.innerHTML = `<div class="loading-spinner w-5 h-5 border-white border-t-transparent rounded-full inline-block mr-2"></div> กำลังลบ...`;
        try {
            // Firestore batches are limited to 500 operations.
            // This function will process documents in chunks of 400 to be safe.
            const deleteCollection = async (collectionRef) => {
                let querySnapshot = await getDocs(query(collectionRef));
                while (querySnapshot.size > 0) {
                    const batch = writeBatch(db);
                    querySnapshot.docs.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                    querySnapshot = await getDocs(query(collectionRef)); // Re-fetch to see if any remain
                }
            };
            await deleteCollection(collection(db, "transfers"));
            await deleteCollection(collection(db, "issues"));
            
            showNotification("ลบข้อมูลของเข้าและปัญหาทั้งหมดสำเร็จ");
        } catch (error) {
            console.error("Error deleting all data:", error);
            showNotification("เกิดข้อผิดพลาดในการลบข้อมูล", false);
        } finally {
             button.disabled = false;
             button.textContent = 'ลบข้อมูลของเข้าทั้งหมด (เพื่อทดสอบ)';
        }
    }
    
    document.getElementById('delete-all-data-btn')?.addEventListener('click', () => {
        showConfirmationModal(
            'คำเตือน! การกระทำนี้จะลบข้อมูล "ของเข้าทั้งหมด" และ "สินค้ามีปัญหา" ทั้งหมดออกจากระบบอย่างถาวร ไม่สามารถกู้คืนได้ คุณแน่ใจหรือไม่ว่าต้องการดำเนินการต่อ?',
            deleteAllInboundData
        );
    });
    
    document.getElementById('backup-restore-btn')?.addEventListener('click', () => {
        backupModal.classList.remove('hidden');
        backupModal.classList.add('flex');
    });
    
    document.getElementById('backup-modal-cancel')?.addEventListener('click', () => {
        backupModal.classList.add('hidden');
        backupModal.classList.remove('flex');
    });
    
    document.getElementById('backup-data-btn').addEventListener('click', async () => {
        const allData = {
            transfers: [...allTransfersData, ...completedTransfersData],
            issues: Object.values(issuesData).flat(),
            scores: allScores,
            users: allUsers,
            starPoints: allStarPoints
        };
         const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allData, null, 2));
         const downloadAnchorNode = document.createElement('a');
         downloadAnchorNode.setAttribute("href", dataStr);
         downloadAnchorNode.setAttribute("download", `inbound_backup_${new Date().toISOString().split('T')[0]}.json`);
         document.body.appendChild(downloadAnchorNode);
         downloadAnchorNode.click();
         document.body.removeChild(downloadAnchorNode);
         showNotification("กำลังดาวน์โหลดไฟล์ Backup...");
    });
    
    const restoreFileInput = document.getElementById('restore-file-input');
    const restoreDataBtn = document.getElementById('restore-data-btn');
    let restoreFile = null;
    
    restoreFileInput.addEventListener('change', (e) => {
        restoreFile = e.target.files[0];
        if (restoreFile) {
            restoreDataBtn.disabled = false;
        } else {
            restoreDataBtn.disabled = true;
        }
    });
    
    restoreDataBtn.addEventListener('click', () => {
        if (!restoreFile) {
            showNotification("กรุณาเลือกไฟล์ Backup ก่อน", false);
            return;
        }
        showConfirmationModal("การกู้คืนข้อมูลจะเขียนทับข้อมูลที่มีอยู่ทั้งหมด คุณแน่ใจหรือไม่?", () => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.transfers && data.issues && data.scores && data.users && data.starPoints) {
                        restoreDataBtn.disabled = true;
                        restoreDataBtn.innerHTML = `<div class="loading-spinner w-5 h-5 border-white border-t-transparent rounded-full inline-block mr-2"></div> กำลังกู้คืน...`;
                        
                        // This is a simplified restore. A real-world scenario would need more robust error handling and batching.
                        const batch = writeBatch(db);
                        data.transfers.forEach(item => {
                            const { id, ...itemData } = item; // Separate ID from data
                            batch.set(doc(db, "transfers", id), itemData);
                        });
                        data.issues.forEach(item => {
                             const { id, ...itemData } = item;
                            batch.set(doc(db, "issues", id), itemData);
                        });
                        data.scores.forEach(item => {
                             const { id, ...itemData } = item;
                            batch.set(doc(db, "scores", id), itemData);
                        });
                        data.starPoints.forEach(item => {
                             const { id, ...itemData } = item;
                            batch.set(doc(db, "starPoints", id), itemData);
                        });
                        await batch.commit();
                        showNotification("กู้คืนข้อมูลสำเร็จ!");
                        backupModal.classList.add('hidden');
                    } else {
                        throw new Error("Invalid backup file format.");
                    }
                } catch (error) {
                    console.error("Restore error:", error);
                    showNotification("ไฟล์ Backup ไม่ถูกต้อง หรือเกิดข้อผิดพลาด", false);
                } finally {
                    restoreDataBtn.disabled = false;
                    restoreDataBtn.textContent = 'Restore ข้อมูล';
                    restoreFileInput.value = '';
                }
            };
            reader.readAsText(restoreFile);
        });
    });
    
    // LOG Function
    async function logAction(action, details) {
        try {
            await addDoc(collection(db, "logs"), {
                action: action,
                details: details,
                userId: currentUser.uid,
                userName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error logging action:", error);
        }
    }
});
