// scripts.js

// Firebase Core and Auth
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// Firestore Database
import { getFirestore, doc, setDoc, getDoc, addDoc, updateDoc, deleteDoc, collection, onSnapshot, serverTimestamp, query, where, getDocs, writeBatch, arrayUnion } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJRXZqHsSKT6ea1bVM9ctycAlg0cqeT50",
  authDomain: "inbound-system-prod.firebaseapp.com",
  projectId: "inbound-system-prod",
  storageBucket: "inbound-system-prod.appspot.com",
  messagingSenderId: "1080446836155",
  appId: "1:1080446836155:web:da8d3f12f76d83b408389e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Your Gemini API Key
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
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    };
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
    
    // Form and view elements
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
    const notificationBellBtn = document.getElementById('notification-bell-btn');
    const notificationDropdown = document.getElementById('notification-dropdown');

    // State variables
    let currentChartInstances = {};
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
    let performanceTimerInterval = null;


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
    
        // Define which classes are visible for each role
        const rolePermissions = {
            'Admin': ['admin-only', 'admin-supervisor-only', 'senior-and-up', 'delete-permission', 'plan-work-permission'],
            'Supervisor': ['admin-supervisor-only', 'senior-and-up', 'delete-permission', 'plan-work-permission'],
            'Senior': ['senior-and-up', 'plan-work-permission'],
            'Officer': [],
            'Viewer': [] 
        };
    
        // Hide all role-specific elements by default
        const allRoleClasses = ['.admin-only', '.admin-supervisor-only', '.senior-and-up', '.delete-permission', '.plan-work-permission'];
        document.querySelectorAll(allRoleClasses.join(', ')).forEach(el => el.style.display = 'none');
    
        // Show elements based on the current user's role
        if (rolePermissions[role]) {
            rolePermissions[role].forEach(className => {
                document.querySelectorAll(`.${className}`).forEach(el => {
                    // Use a more appropriate display property if needed, e.g., 'flex' for flex containers
                    if (el.tagName === 'BUTTON' || el.tagName === 'DIV' && el.classList.contains('grid')) {
                         el.style.display = 'block'; // Or 'inline-block', 'flex' as appropriate from your CSS
                    } else if (el.closest('td') || el.closest('th')) {
                         el.style.display = 'table-cell';
                    }
                    else {
                         el.style.display = 'block';
                    }
                });
            });
        }
    
        // Special case for Viewer: disable inputs and buttons
        const isViewer = role === 'Viewer';
        document.querySelectorAll('input, select, textarea, button').forEach(el => {
            if (!el.closest('#login-register-view') && !el.closest('.modal-overlay') && !el.classList.contains('back-to-main-menu')) {
                 el.disabled = isViewer;
            }
        });
        document.querySelectorAll('.edit-button').forEach(el => {
            el.style.display = isViewer ? 'none' : 'block';
        });
    }

    
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                currentUserProfile = userDoc.data();
            } else {
                currentUserProfile = {
                    email: user.email,
                    firstName: "ผู้ใช้",
                    lastName: "ใหม่",
                    role: 'Officer',
                    smallStars: 0,
                    bigStars: 0
                };
            }
            isAdmin = currentUserProfile.role === 'Admin'; 
    
            if (currentUserProfile.smallStars === undefined) currentUserProfile.smallStars = 0;
            if (currentUserProfile.bigStars === undefined) currentUserProfile.bigStars = 0;
            
            updateUserDisplays(currentUserProfile);
            setupFirestoreListeners();
            showMainView(views.mainMenu);
            updateUIForRoles();
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
            updateNotifications();

            // Refresh currently visible views
            if (views.transfers.style.display === 'block') {
                if (detailsView.style.display === 'block') renderDetailsTable();
                if (completedView.style.display === 'block') renderCompletedView();
                if (issuesView.style.display === 'block') renderIssuesView();
            }
            if (views.checkProduct.style.display === 'block') renderCheckProductView();
            if (views.statistics.style.display === 'block') renderAdvancedStatistics();
            if (views.todaysPlan.style.display === 'block') renderTodaysPlanView();
            if (views.kpi.style.display === 'block') renderKpiView();
            if (views.profile.style.display === 'block') renderRecentActivity();

        }, (error) => console.error("Transfers listener error:", error));
    
        const issuesQuery = query(collection(db, "issues"));
        unsubscribeIssues = onSnapshot(issuesQuery, (snapshot) => {
            issuesData = {};
            snapshot.docs.forEach(doc => {
                const issue = { id: doc.id, ...doc.data() };
                const type = (issue.issueTypes && issue.issueTypes.length > 0) ? issue.issueTypes[0] : 'อื่นๆ';
                if (!issuesData[type]) {
                    issuesData[type] = [];
                }
                issuesData[type].push(issue);
            });
            updateMainMenuSummary();
            if (views.transfers.style.display === 'block' && issuesView.style.display === 'block') renderIssuesView();

        }, (error) => console.error("Issues listener error:", error));
    
        const userRole = currentUserProfile?.role;
        if (userRole === 'Admin' || userRole === 'Supervisor') {
            const usersQuery = query(collection(db, "users"));
            unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
                allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (views.kpi.style.display === 'block') renderKpiView();
            });
            
            const scoresQuery = query(collection(db, "scores"));
            unsubscribeScores = onSnapshot(scoresQuery, (snapshot) => {
                allScores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            });

            const starPointsQuery = query(collection(db, "starPoints"));
            unsubscribeStarPoints = onSnapshot(starPointsQuery, (snapshot) => {
                allStarPoints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            });
        }
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        loadingContainer.style.display = 'flex';
        signInWithEmailAndPassword(auth, loginForm['login-email'].value, loginForm['login-password'].value)
            .then(() => showNotification('เข้าสู่ระบบสำเร็จ!'))
            .catch((error) => showNotification(`เข้าสู่ระบบไม่สำเร็จ: ${error.message}`, false))
            .finally(() => loadingContainer.style.display = 'none');
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
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
                role: 'Officer',
                smallStars: 0,
                bigStars: 0
            });
            showNotification('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
            showAuthForm('login');
        } catch (error) {
            showNotification(`สมัครสมาชิกไม่สำเร็จ: ${error.message}`, false);
        } finally {
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
            e.target.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
        });
    });

    function updateMainMenuSummary() {
        const todayString = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        const allIssuesList = Object.values(issuesData).flat();
        
        const pendingCount = allTransfersData.filter(t => !t.scheduledDate).length;
        const todaysPlanCount = allTransfersData.filter(t => t.scheduledDate === todayString).length;
        const completedTodayCount = completedTransfersData.filter(t => t.completionDate === todayString).length;
        const issuesCount = allIssuesList.filter(issue => issue.reportDate === todayString).length;
        
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
                    let { width, height } = img;
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
                img.onerror = reject;
            };
            reader.onerror = reject;
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
                    div.innerHTML = `<img src="${resizedBase64}" class="w-full h-full object-cover"><button type="button" class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>`;
                    previewContainer.appendChild(div);
                    div.querySelector('button').addEventListener('click', () => {
                        const index = imageArray.indexOf(resizedBase64);
                        if (index > -1) imageArray.splice(index, 1);
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
                <div class="linked-tfor-list mt-2 flex flex-wrap gap-2"></div>
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
                button.classList.toggle('active');
                const selectedValues = Array.from(tforBlock.querySelectorAll('.pallet-button.active')).map(b => b.dataset.value).sort((a,b) => parseInt(a) - parseInt(b));
                tforBlock.querySelector('.pallet-count-input').value = selectedValues.join(',');
                tforBlock.querySelector('.pallet-status').textContent = selectedValues.length > 0 ? `เลือกแล้ว ${selectedValues.length} พาเลท: ${selectedValues.join(', ')}` : `ยังไม่ได้เลือกพาเลท`;
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
                const fullTfor = `...${tforValue}`;
                const listItem = document.createElement('div');
                listItem.className = 'flex items-center justify-between bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full';
                listItem.innerHTML = `
                    <span>${fullTfor}</span>
                    <button type="button" class="remove-linked-tfor text-blue-600 font-bold ml-1.5">&times;</button>
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
                    createdByName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`,
                    checkStartTime: null,
                    checkDuration: null,
                    comments: []
                };
                const newTransferRef = doc(collection(db, "transfers"));
                batch.set(newTransferRef, tforData);
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
        const checkedPallets = [...(currentTforData.checkedPallets || [])];
        const index = checkedPallets.indexOf(palletNum);

        if (index > -1) {
            checkedPallets.splice(index, 1); // Uncheck
        } else {
            checkedPallets.push(palletNum); // Check
        }

        const isNowCompleted = checkedPallets.length === currentTforData.palletNumbers.length;
        const updateData = {
            checkedPallets,
            isCompleted: isNowCompleted,
            lastCheckedByUid: currentUser.uid,
            lastCheckedByName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`
        };

        if (isNowCompleted && currentTforData.checkStartTime) {
            const startTime = currentTforData.checkStartTime.toDate();
            const endTime = new Date();
            const durationMinutes = Math.round((endTime - startTime) / 60000);
            updateData.checkDuration = `${durationMinutes} นาที`;
            updateData.checkEndTime = serverTimestamp();
            clearInterval(performanceTimerInterval);
        }
        
        if (isNowCompleted) {
            updateData.completionDate = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        }

        const transferDocRef = doc(db, "transfers", currentTforData.id);
        await updateDoc(transferDocRef, updateData);
        showNotification(`อัปเดตสถานะพาเลท ${palletNum} แล้ว`);
    }

    // Performance Timer Functions
    async function startPerformanceTimer() {
        if (currentTforData.checkStartTime) {
            showNotification('การจับเวลาได้เริ่มไปแล้ว', false);
            return;
        }
        try {
            const transferDocRef = doc(db, "transfers", currentTforData.id);
            await updateDoc(transferDocRef, { checkStartTime: serverTimestamp() });
            showNotification('เริ่มจับเวลาการเช็ค!');
        } catch (error) {
            console.error("Error starting timer:", error);
            showNotification('ไม่สามารถเริ่มจับเวลาได้', false);
        }
    }

    function renderTimer(startTime) {
        const timerContainer = document.getElementById('timer-display-container');
        clearInterval(performanceTimerInterval);
        performanceTimerInterval = setInterval(() => {
            const now = new Date();
            const elapsed = now - startTime.toDate();
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            timerContainer.innerHTML = `
                <p class="text-lg font-semibold">เวลาที่ใช้: <span class="font-mono">${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</span></p>
            `;
        }, 1000);
    }

    // Commenting System Functions
    function renderComments(comments = []) {
        const container = document.getElementById('comments-display-container');
        if (!container) return;
        if (!comments || comments.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-500 text-center">ยังไม่มีความคิดเห็น</p>';
            return;
        }
        container.innerHTML = comments.map(comment => {
            const timestamp = comment.timestamp?.seconds ? new Date(comment.timestamp.seconds * 1000).toLocaleString('th-TH') : 'N/A';
            return `
                <div class="comment-bubble">
                    <div class="comment-meta">
                        <strong>${comment.userName}</strong> - <span>${timestamp}</span>
                    </div>
                    <p>${comment.text}</p>
                </div>
            `
        }).join('');
        container.scrollTop = container.scrollHeight;
    }

    async function handleCommentSubmit(e) {
        e.preventDefault();
        const input = document.getElementById('comment-input');
        const text = input.value.trim();
        if (!text) return;

        const newComment = {
            text,
            userId: currentUser.uid,
            userName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`,
            timestamp: new Date() 
        };

        try {
            const transferDocRef = doc(db, "transfers", currentTforData.id);
            await updateDoc(transferDocRef, {
                comments: arrayUnion(newComment)
            });
            input.value = '';
        } catch (error) {
            console.error("Error adding comment:", error);
            showNotification("ไม่สามารถเพิ่มความคิดเห็นได้", false);
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
        
        try {
            await updateDoc(transferDocRef, {
                isReceived: true,
                receivedDate: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
                receivedPallets: receivedPallets,
                lastReceivedByUid: currentUser.uid,
                lastReceivedByName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`
            });
            
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
    
    async function deleteTransfer(transferId) {
        showConfirmationModal("คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้และปัญหาที่เกี่ยวข้องทั้งหมด?", async () => {
            try {
                const batch = writeBatch(db);
                batch.delete(doc(db, "transfers", transferId));
                const issuesSnapshot = await getDocs(query(collection(db, "issues"), where("transferId", "==", transferId)));
                issuesSnapshot.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                
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
        let filteredData = allTransfersData.filter(d => !d.scheduledDate);

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
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">TFOR หลัก/พ่วง</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">สาขา</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ทะเบียนรถ</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">พาเลท</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase delete-permission">จัดการ</th>
            </tr></thead>
            <tbody class="bg-white divide-y divide-gray-200"></tbody>`;
        
        const tbody = table.querySelector('tbody');
        filteredData.forEach(data => {
            const linkedTforsHtml = (data.linkedTfors && data.linkedTfors.length > 0)
                ? `<div class="flex flex-wrap gap-1 mt-1">${data.linkedTfors.map(lt => `<span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">${lt}</span>`).join('')}</div>`
                : '';
                
            const row = tbody.insertRow();
            row.className = 'hover:bg-gray-50 cursor-pointer';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">รอดำเนินการ</span></td>
                <td class="px-6 py-4 text-sm">${formatDateAbbreviated(data.deliveryDate)}</td>
                <td class="px-6 py-4 text-sm">...${data.tforNumber}${linkedTforsHtml}</td>
                <td class="px-6 py-4 text-sm">${data.branch}</td>
                <td class="px-6 py-4 text-sm">${data.licensePlate}</td>
                <td class="px-6 py-4 text-sm">${data.palletCount}</td>
                <td class="px-6 py-4 text-sm flex items-center space-x-2 delete-permission"></td>`;
            
            row.addEventListener('click', () => {
                currentTforData = data;
                renderCheckView();
                showSubView(checkView);
            });
            const adminCell = row.cells[6];
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;
            deleteButton.className = 'text-red-500 hover:text-red-700';
            deleteButton.onclick = (e) => { e.stopPropagation(); deleteTransfer(data.id); };
            if(adminCell) adminCell.appendChild(deleteButton);
        });
        
        updateUIForRoles();
        container.appendChild(table);
    }
    
    detailsModal.addEventListener('showDetails', (e) => showDetailsModal(e.detail.item));
    
    document.getElementById('details-search').addEventListener('input', (e) => renderDetailsTable(e.target.value, document.getElementById('details-sort').value));
    document.getElementById('details-sort').addEventListener('change', (e) => renderDetailsTable(document.getElementById('details-search').value, e.target.value));

    document.getElementById('plan-work-btn')?.addEventListener('click', () => {
         showSchedulingModal(new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }));
    });
    
    function calculateDueDate(startDate) {
        if (!startDate) return new Date();
        let date = new Date(startDate);
        let addedDays = 0;
        while (addedDays < 3) {
            date.setDate(date.getDate() + 1);
            const dayOfWeek = date.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { 
                addedDays++;
            }
        }
        return date;
    }

    function renderCheckView() {
        if (!currentTforData) return;
        previousView = detailsView;
        const detailsContainer = document.getElementById('check-details-container');
        const palletButtonsContainer = document.getElementById('pallet-buttons-container');
        const receivePalletButtonsContainer = document.getElementById('receive-pallet-buttons-container');
        const issuePalletButtonsContainer = document.getElementById('issue-pallet-buttons-container');
        const issueFormsContainer = document.getElementById('issue-forms-container');
        
        // Timer Section
        const timerContainer = document.getElementById('timer-display-container');
        clearInterval(performanceTimerInterval);
        if (currentTforData.checkDuration) {
            timerContainer.innerHTML = `<p class="text-lg font-semibold">ใช้เวลาเช็ค: <span class="text-green-600">${currentTforData.checkDuration}</span></p>`;
        } else if (currentTforData.checkStartTime && currentTforData.checkStartTime.toDate) {
            renderTimer(currentTforData.checkStartTime);
        } else {
            timerContainer.innerHTML = `<button id="start-timer-btn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">เริ่มเช็ค</button>`;
            setTimeout(() => { // Use timeout to ensure element is in DOM
                document.getElementById('start-timer-btn')?.addEventListener('click', startPerformanceTimer);
            }, 0);
        }

        // Comment Section
        renderComments(currentTforData.comments);
        const commentForm = document.getElementById('comment-form');
        if (commentForm) {
             commentForm.onsubmit = handleCommentSubmit;
        }

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
           <div class="mt-4"><p class="text-sm font-semibold text-gray-500 mb-2">รูปภาพรวม</p>${imagesHTML}</div>
        `;
        
        palletButtonsContainer.innerHTML = '';
        (currentTforData.palletNumbers || []).forEach(palletNum => {
            const checkBtn = document.createElement('button');
            checkBtn.className = `pallet-check-button px-4 py-2 text-sm rounded-full transition-all transform hover:scale-105 ${currentTforData.checkedPallets?.includes(palletNum) ? 'bg-green-500 text-white' : 'bg-gray-200'}`;
            checkBtn.textContent = `พาเลทที่ ${palletNum}`;
            checkBtn.dataset.palletNumber = palletNum;
            checkBtn.addEventListener('click', (e) => handlePalletCheck(palletNum, e.currentTarget));
            palletButtonsContainer.appendChild(checkBtn);
        });

    }

    function renderIssuesView() {
        const container = document.getElementById('issues-container');
        container.innerHTML = '';
        const allIssues = Object.values(issuesData).flat().sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

        if (allIssues.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center">ไม่พบรายการสินค้ามีปัญหา</p>`;
            return;
        }

        allIssues.forEach(issue => {
            const issueCard = document.createElement('div');
            issueCard.className = 'bg-white rounded-lg shadow-md p-4 space-y-2';
            const status = issue.issueStatus || 'รอดำเนินการ';
            let statusClass = 'status-pending';
            if (status === 'กำลังแก้ไข') statusClass = 'status-in-progress';
            if (status === 'แก้ไขแล้ว') statusClass = 'status-resolved';

            issueCard.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-semibold">TFOR: ...${issue.tforNumber} (${issue.branch})</p>
                        <p class="text-sm text-gray-600">${issue.licensePlate} - ${issue.reportDate}</p>
                        <p class="text-sm text-red-600 font-bold">${(issue.issueTypes || []).join(', ')}</p>
                    </div>
                    <div class="senior-and-up">
                        <select class="status-select" data-issue-id="${issue.id}">
                            <option value="รอดำเนินการ" ${status === 'รอดำเนินการ' ? 'selected' : ''}>รอดำเนินการ</option>
                            <option value="กำลังแก้ไข" ${status === 'กำลังแก้ไข' ? 'selected' : ''}>กำลังแก้ไข</option>
                            <option value="แก้ไขแล้ว" ${status === 'แก้ไขแล้ว' ? 'selected' : ''}>แก้ไขแล้ว</option>
                        </select>
                    </div>
                </div>
                <div class="flex items-center justify-between">
                     <span class="status-badge ${statusClass}">${status}</span>
                     <button class="text-sm text-blue-600 hover:underline view-details-btn">ดูรายละเอียด</button>
                </div>
            `;
            container.appendChild(issueCard);

            issueCard.querySelector('.view-details-btn').addEventListener('click', () => showDetailsModal(issue));
            const statusSelect = issueCard.querySelector('.status-select');
            if (statusSelect) {
                statusSelect.addEventListener('change', async (e) => {
                    const newStatus = e.target.value;
                    const issueId = e.target.dataset.issueId;
                    try {
                        await updateDoc(doc(db, "issues", issueId), { issueStatus: newStatus });
                        showNotification('อัปเดตสถานะสำเร็จ');
                    } catch (err) {
                        showNotification('เกิดข้อผิดพลาด', false);
                    }
                });
            }
        });
        updateUIForRoles();
    }

    // Notification Logic
    function updateNotifications() {
        const badge = document.getElementById('notification-badge');
        const list = document.getElementById('notification-list');
        const overdueItems = allTransfersData.filter(t => {
            if (!t.deliveryDate) return false;
            const dueDate = calculateDueDate(parseThaiDate(t.deliveryDate));
            return dueDate < new Date() && !t.isCompleted;
        });

        badge.textContent = overdueItems.length;
        if (overdueItems.length > 0) {
            badge.classList.remove('hidden');
            list.innerHTML = overdueItems.map(item => `
                <div class="p-2 hover:bg-gray-100 rounded-md cursor-pointer notification-item" data-id="${item.id}">
                    <p class="font-semibold text-sm">TFOR ...${item.tforNumber}</p>
                    <p class="text-xs text-red-600">เลยกำหนดแล้ว</p>
                </div>
            `).join('');
        } else {
            badge.classList.add('hidden');
            list.innerHTML = '<p class="p-4 text-sm text-gray-500">ไม่มีการแจ้งเตือน</p>';
        }
    }

    notificationBellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notificationDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!notificationBellBtn.contains(e.target) && !notificationDropdown.contains(e.target)) {
            notificationDropdown.classList.add('hidden');
        }
        if (e.target.closest('.notification-item')) {
            const id = e.target.closest('.notification-item').dataset.id;
            const item = allTransfersData.find(t => t.id === id);
            if (item) {
                currentTforData = item;
                showMainView(views.transfers);
                renderCheckView();
                showSubView(checkView);
                notificationDropdown.classList.add('hidden');
            }
        }
    });
    
    // --- The rest of your existing functions go here ---
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
            if (adminCell) {
                const deleteButton = document.createElement('button');
                deleteButton.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;
                deleteButton.className = 'text-red-500 hover:text-red-700';
                deleteButton.onclick = () => deleteTransfer(data.id);
                adminCell.appendChild(deleteButton);
            }
            
            container.appendChild(card);
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
           
           detailsModalContent.innerHTML += `
               <h2 class="text-xl font-bold mb-4">รายละเอียด</h2>
               <div class="space-y-3">
                   <p><strong>วันที่:</strong> ${item.deliveryDate}</p>
                   <p><strong>ทะเบียนรถ:</strong> ${item.licensePlate}</p>
                   <p><strong>TFOR:</strong> ...${item.tforNumber}</p>
                   <p><strong>สาขา:</strong> ${item.branch}</p>
                   <p><strong>ประเภทปัญหา:</strong> ${item.issueTypes ? item.issueTypes.join(', ') : 'N/A'}</p>
                   <p><strong>หมายเหตุ:</strong> ${item.issueNotes || '-'}</p>
                   <p><strong>รูปภาพ:</strong></p>
                   ${imagesHTML}
               </div>
           `;
       }
       detailsModal.classList.remove('hidden');
       detailsModal.classList.add('flex');
    }

    detailsModal.addEventListener('click', (e) => {
       if (e.target.id === 'close-details-modal' || e.target.id === 'details-modal') {
            detailsModal.classList.add('hidden');
            detailsModal.classList.remove('flex');
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

    if(chatForm) {
        addChatMessage('สวัสดีครับ ผม INBOUND-ASSISTANT ผู้ช่วย AI พร้อมให้บริการครับ!', 'ai');

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
            const fullPrompt = `คุณคือผู้ช่วย AI ของ INBOUND SYSTEM. ตอบคำถามโดยใช้ข้อมูลจาก JSON ที่ให้มาเท่านั้น: ${dataContext} คำถาม: "${userMessage}"`;
            try {
                const aiResponse = await callGeminiAPI(fullPrompt);
                thinkingBubble.remove();
                addChatMessage(aiResponse, 'ai');
            } catch (error) {
                thinkingBubble.textContent = 'ขออภัยค่ะ ระบบ AI มีปัญหา กรุณาลองใหม่';
                console.error("AI Error:", error);
            }
        });
    }

    // --- Add missing functions here ---
    function formatDateAbbreviated(dateString) {
        const date = parseThaiDate(dateString);
        if (!date) return dateString;
        const day = date.getDate();
        const month = thaiMonths[date.getMonth()].substring(0, 3);
        const year = (date.getFullYear() + 543).toString().slice(-2);
        return `${day} ${month} ${year}`;
    }

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
    // ... continue adding ALL other functions from the original full script ...
    // This includes: showConfirmationModal, KPI logic, Profile logic, Backup logic, Log logic, etc.
});
    function formatDateAbbreviated(dateString) {
        if (!dateString) return 'N/A';
        const date = parseThaiDate(dateString);
        if (!date) return dateString;
        const day = date.getDate();
        const month = thaiMonths[date.getMonth()].substring(0, 3);
        const year = (date.getFullYear() + 543).toString().slice(-2);
        return `${day} ${month} ${year}`;
    }

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