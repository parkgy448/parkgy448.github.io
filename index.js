function esc(str = "") {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// 로그인 상태 변수
let isLoggedIn = false;
let currentChatId = null;
let chatUnsubscribe = null;
let adminChatUnsubscribe = null;
let currentAdminChatId = null;
let isAccountVerified = false;
const DEFAULT_AVATAR_URL = "https://i.ibb.co/jP4t3sHz/12225935.png";

// Firebase 구성
const firebaseConfig = {
    apiKey: "AIzaSyAr_S6URDXWbjQ4Gh0Nw_JOeTkHA_G8Uis",
    authDomain: "cloud-casino-34cc6.firebaseapp.com",
    projectId: "cloud-casino-34cc6",
    storageBucket: "cloud-casino-34cc6.firebasestorage.app",
    messagingSenderId: "289867400095",
    appId: "1:289867400095:web:c9060c2a534225db9cf3aa",
};

// Firebase 초기화
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Firestore 초기화
const db = firebase.firestore();
const auth = firebase.auth();

// 로딩 스피너 표시/숨기기 함수
function showLoading() {
    document.getElementById("loadingSpinner").style.display = "flex";
}

function hideLoading() {
    document.getElementById("loadingSpinner").style.display = "none";
}

/* Aurora Gradient Film */
function initAurora() {
    const c = document.getElementById("bgAurora");
    if (!c) return;
    const ctx = c.getContext("2d");

    function resize() {
        c.width = window.innerWidth;
        c.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);
    const stripes = 5;

    function draw() {
        ctx.clearRect(0, 0, c.width, c.height);
        for (let i = 0; i < stripes; i++) {
            const g = ctx.createLinearGradient(0, 0, c.width, 0);
            const hue = (Date.now() / 40 + i * 72) % 360;
            g.addColorStop(0, `hsla(${hue},90%,55%,.06)`);
            g.addColorStop(0.5, `hsla(${(hue + 40) % 360},90%,55%,.22)`);
            g.addColorStop(1, `hsla(${(hue + 80) % 360},90%,55%,.06)`);
            ctx.fillStyle = g;
            const y = (i / stripes) * c.height * 2 - c.height / 2 + Math.sin(Date.now() / 2500 + i) * 100;
            ctx.fillRect(-c.width, y, c.width * 2, c.height / stripes);
        }
        requestAnimationFrame(draw);
    }
    draw();
}

/* Floating Particles */
function createParticles() {
    const particlesContainer = document.getElementById("particles");
    const particleCount = 60;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement("div");
        particle.classList.add("particle");
        const size = Math.random() * 2 + 1;
        particle.style.width = particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}vw`;
        particle.style.top = `${Math.random() * 100}vh`;
        const duration = Math.random() * 10 + 10;
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${Math.random() * 10}s`;
        particlesContainer.appendChild(particle);
    }
}

/* Modal control */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    // 커스텀 이벤트 트리거
    const event = new Event("shown");
    modal.dispatchEvent(event);

    // 고객센터 모달만 특수 처리
    if (modalId === "csModal") {
        initCustomerChat();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
    document.body.style.overflow = "auto";

    // 고객센터 모달 닫힐 때 채팅 구독 해제 (생략)
    // ...중략...

    // 🔥 충전모달 닫힐 때 계좌 안내와 인증상태 초기화
    if (modalId === "chargeModal") {
        const accountResult = document.getElementById("accountResult");
        const pwWrap = document.getElementById("accountPwWrap");
        if (accountResult) accountResult.textContent = "계좌확인을 위해 비밀번호를 입력해주세요";
        if (pwWrap) pwWrap.style.display = "none";
        window.isAccountVerified = false;
    }
}

/* Under Maintenance Alert */
function showUnderMaintenance() {
    const alertBox = document.createElement("div");
    alertBox.style.position = "fixed";
    alertBox.style.top = "50%";
    alertBox.style.left = "50%";
    alertBox.style.transform = "translate(-50%, -50%)";
    alertBox.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
    alertBox.style.border = "2px solid var(--neon-blue)";
    alertBox.style.borderRadius = "10px";
    alertBox.style.padding = "20px";
    alertBox.style.zIndex = "2000";
    alertBox.style.textAlign = "center";
    alertBox.style.boxShadow = "0 0 30px rgba(0, 170, 255, 0.5)";
    alertBox.style.maxWidth = "80%";
    alertBox.style.animation = "fadeIn 0.3s ease";

    alertBox.innerHTML = `
            <h3 style="color: var(--neon-blue); margin-bottom: 15px;">현재 점검 중입니다</h3>
            <p style="margin-bottom: 20px;">서비스 이용에 불편을 드려 죄송합니다.<br>보다 나은 서비스를 위해 시스템 점검을 진행 중입니다.</p>
            <button id="closeAlert" style="background: var(--neon-blue); color: black; border: none; padding: 8px 20px; border-radius: 20px; cursor: pointer; font-weight: 600;">확인</button>
        `;

    document.body.appendChild(alertBox);

    const closeButton = alertBox.querySelector("#closeAlert");
    closeButton.addEventListener("click", function () {
        alertBox.style.animation = "fadeIn 0.3s ease reverse";
        setTimeout(() => {
            document.body.removeChild(alertBox);
        }, 300);
    });
}
let currentDepositAccount = ""; // 복사 버튼에서 사용

function loadDepositAccount() {
    db.collection("config")
        .doc("depositAccount")
        .onSnapshot((doc) => {
            if (!doc.exists) return;
            const { bank, accountNumber, holder } = doc.data();
            currentDepositAccount = `${bank} ${accountNumber} / 예금주: ${holder}`;
            // accountResult에는 초기에는 아무것도 넣지 않음!
        });
}

/* Amount buttons */
function setupAmountButtons() {
    const amountButtons = document.querySelectorAll(".amount-btn");

    amountButtons.forEach((button) => {
        button.addEventListener("click", function () {
            amountButtons.forEach((btn) => btn.classList.remove("active"));
            this.classList.add("active");

            // 금액 계산
            const rawText = this.textContent.trim(); // 예: '3만원'
            let amount = parseInt(rawText.replace(/[^0-9]/g, ""));
            if (rawText.includes("만")) amount *= 10000;

            // ▼ type="text" 필드에 ‘콤마 + 원’ 형식으로 입력
            const modal = this.closest(".modal-content");
            const customInput = modal.querySelector(".amount-input");
            if (customInput) customInput.value = amount.toLocaleString("ko-KR") + "원";
        });
    });

    // ▼ 직접 타이핑하면 버튼 active 해제
    document.querySelectorAll(".amount-input").forEach((input) => {
        input.addEventListener("input", function () {
            this.closest(".modal-content")
                .querySelectorAll(".amount-btn")
                .forEach((btn) => btn.classList.remove("active"));
        });
    });
}

/* Tabs */
function setupTabs() {
    const tabs = document.querySelectorAll(".game-tab");
    tabs.forEach((tab) => {
        tab.addEventListener("click", function () {
            tabs.forEach((t) => t.classList.remove("active"));
            this.classList.add("active");

            const tabType = this.getAttribute("data-tab");
            document.querySelectorAll(".game-cards").forEach((section) => {
                section.style.display = "none";
            });

            if (tabType === "casino") {
                document.getElementById("casinoTab").style.display = "grid";
            } else if (tabType === "minigame") {
                document.getElementById("minigameTab").style.display = "grid";
            }
        });
    });
}

function setupChargeTabs() {
    const tabs = document.querySelectorAll(".charge-tab");
    tabs.forEach((tab) => {
        tab.addEventListener("click", function () {
            document.querySelectorAll(".charge-tab").forEach((t) => t.classList.remove("active"));
            this.classList.add("active");

            const tabType = this.getAttribute("data-tab");
            document.querySelectorAll(".charge-tab-content").forEach((content) => {
                content.classList.remove("active");
            });

            if (tabType === "request") {
                document.getElementById("chargeRequestTab").classList.add("active");
            } else if (tabType === "history") {
                document.getElementById("chargeHistoryTab").classList.add("active");
                loadChargeHistory();
            }
        });
    });
}

function setupChargeSubmit() {
    const chargeModal = document.getElementById("chargeModal");
    if (!chargeModal) return;

    // 모달이 열릴 때 한 번씩만 실행
    chargeModal.addEventListener("shown", () => {
        const submitBtn = document.getElementById("submitChargeBtn");
        if (!submitBtn) return;

        // ✔ once:true ⇒ 리스너는 클릭 후 자동 해제돼 중복 전송을 막습니다
        submitBtn.addEventListener(
            "click",
            async () => {
                /* (기존 로직 그대로) */
                const amountInput = document.getElementById("customChargeAmount");
                const activeBtn = document.querySelector(".amount-btn.active");
                const pointOptionEl = document.querySelector('input[name="pointOption"]:checked');

                const rawAmount = (amountInput?.value || activeBtn?.textContent || "").replace(/[^0-9]/g, "");
                const amount = parseInt(rawAmount, 10);
                if (!amount || isNaN(amount) || amount < 10000) {
                    return alert("최소 10,000원 이상 입력해주세요");
                }
                if (!pointOptionEl) {
                    return alert("포인트 옵션을 선택해주세요");
                }

                try {
                    showLoading();
                    const user = auth.currentUser;
                    if (!user) throw new Error("로그인이 필요합니다");

                    const userDoc = await db.collection("users").doc(user.uid).get();
                    if (!userDoc.exists) throw new Error("사용자 정보를 찾을 수 없습니다");

                    await db.collection("chargeRequests").add({
                        userId: user.uid,
                        userName: userDoc.data().name || user.email,
                        amount,
                        date: new Date().toISOString(),
                        status: "pending",
                        pointOption: pointOptionEl.id,
                        adminNote: "",
                        userBank: userDoc.data().bank,
                        userAccount: userDoc.data().account,
                    });

                    showChargeSuccessNotification(amount);
                    resetChargeForm();
                    loadChargeHistory();
                } catch (err) {
                    console.error("충전 신청 오류:", err);
                    alert("충전 신청 중 오류가 발생했습니다: " + err.message);
                } finally {
                    hideLoading();
                }
            },
            { once: true } // 🔑 중복 방지 핵심 옵션
        );
    });
}

/* ───────── 입력 폼 초기화 ───────── */
function resetChargeForm() {
    const amountInput = document.getElementById("customChargeAmount");
    if (amountInput) amountInput.value = "";

    document.querySelectorAll(".amount-btn").forEach((btn) => {
        btn.classList.remove("active");
    });

    const pointOptions = document.querySelectorAll('input[name="pointOption"]');
    if (pointOptions) {
        pointOptions.forEach((opt) => (opt.checked = false));
    }
}

function resetForm({ amountInput, passwordInput, pointOptions }) {
    amountInput.value = "";
    passwordInput.value = "";
    pointOptions.forEach((opt) => (opt.checked = false));
    document.querySelectorAll(".amount-btn").forEach((btn) => {
        btn.classList.remove("active");
    });
}

function parseChargeAmount(inputValue, btnText) {
    const amountStr = (inputValue || btnText || "").replace(/[^0-9]/g, "");
    return parseInt(amountStr, 10) || null;
}
// Helper 함수들
function calculateChargeAmount({ amountInput, activeAmountBtn }) {
    const amountStr = document.getElementById("customChargeAmount").value.replace(/[^0-9]/g, "");
    const amount = parseInt(amountStr, 10);

    if (isNaN(amount) || amount < 10000) {
        alert("최소 10,000원 이상 입력해주세요");
        return;
    }
    if (amount % 10000 !== 0) {
        alert("10,000원 단위로만 입력 가능합니다.");
        return;
    }
}

function validatePassword(password) {
    if (!password) {
        alert("출금 비밀번호를 입력해주세요.");
        return false;
    }
    return true;
}

function validatePointOption() {
    const selectedOption = document.querySelector('input[name="pointOption"]:checked');
    if (!selectedOption) {
        alert("포인트 옵션을 선택해주세요.");
        return null;
    }
    return selectedOption.id;
}

async function processCharge(amount, pointOption, password) {
    showLoading();
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("로그인이 필요합니다");

        const userDoc = await db.collection("users").doc(user.uid).get();
        if (!userDoc.exists) throw new Error("사용자 정보를 찾을 수 없습니다");
        if (!bcrypt.compareSync(password, userDoc.data().withdrawPassword)) {
            throw new Error("출금 비밀번호가 일치하지 않습니다");
        }

        await db.collection("chargeRequests").add({
            userId: user.uid,
            userName: userDoc.data().name || userDoc.data().userId,
            amount: amount,
            date: new Date().toISOString(),
            status: "pending",
            pointOption: pointOption,
            adminNote: "",
            userBank: userDoc.data().bank,
            userAccount: userDoc.data().account,
            userAccountName: userDoc.data().accountName,
        });

        showChargeSuccessNotification(amount);
        resetChargeForm();
        loadChargeHistory();
    } catch (error) {
        console.error("충전 신청 오류:", error);
        alert(`충전 실패: ${error.message}`);
    } finally {
        hideLoading();
    }
}

function showChargeSuccessNotification(amount) {
    const notification = document.createElement("div");
    notification.className = "charge-success-notification";
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        ${parseInt(amount).toLocaleString()}원 충전 신청 완료!
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = "0";
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

/* 충전 내역 로드 */
function loadChargeHistory() {
    const historyList = document.getElementById("chargeHistoryList");
    const user = auth.currentUser;

    if (!user) {
        historyList.innerHTML = '<div class="no-history">로그인이 필요합니다</div>';
        return;
    }

    showLoading();
    db.collection("chargeRequests")
        .where("userId", "==", user.uid)
        .orderBy("date", "desc")
        .get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                historyList.innerHTML = '<div class="no-history">충전 내역이 없습니다</div>';
                return;
            }

            historyList.innerHTML = "";
            querySnapshot.forEach((doc) => {
                const item = doc.data();
                const historyItem = document.createElement("div");
                historyItem.className = "charge-history-item";

                let statusClass = "status-pending";
                let statusText = "대기중";

                if (item.status === "approved") {
                    statusClass = "status-completed";
                    statusText = "승인됨";
                } else if (item.status === "rejected") {
                    statusClass = "status-rejected";
                    statusText = "거절됨: " + (item.adminNote || "");
                }

                historyItem.innerHTML = `
                    <span>${new Date(item.date).toLocaleString()}</span>
                    <span>${item.amount.toLocaleString()}원</span>
                    <span class="charge-status ${statusClass}">${statusText}</span>
                `;
                historyList.appendChild(historyItem);
            });
        })
        .catch((error) => {
            console.error("충전 내역 로드 오류:", error);
            historyList.innerHTML = '<div class="no-history">내역을 불러오는 중 오류 발생</div>';
        })
        .finally(() => hideLoading());
}

/* Navigation */
function setupNavItems() {
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
        item.addEventListener("click", function () {
            if (!isLoggedIn && this.id !== "homeBtn") {
                openModal("loginModal");
                return;
            }

            navItems.forEach((i) => i.classList.remove("active"));
            this.classList.add("active");
            if (this.id === "chargeBtn") {
                openModal("chargeModal");
            } else if (this.id === "exchangeBtn") {
                openModal("exchangeModal");
            } else if (this.id === "eventBtn") {
                const alertBox = document.createElement("div");
                alertBox.style.position = "fixed";
                alertBox.style.bottom = "100px";
                alertBox.style.left = "50%";
                alertBox.style.transform = "translateX(-50%)";
                alertBox.style.backgroundColor = "rgba(0,0,0,.8)";
                alertBox.style.border = "1px solid var(--neon-blue)";
                alertBox.style.borderRadius = "20px";
                alertBox.style.padding = "10px 20px";
                alertBox.style.zIndex = "2000";
                alertBox.style.textAlign = "center";
                alertBox.style.boxShadow = "0 0 15px rgba(0,170,255,.3)";
                alertBox.style.animation = "fadeIn .3s ease";
                alertBox.textContent = "준비중인 기능입니다";
                document.body.appendChild(alertBox);
                setTimeout(() => {
                    alertBox.style.animation = "fadeIn .3s ease reverse";
                    setTimeout(() => {
                        document.body.removeChild(alertBox);
                    }, 300);
                }, 1500);
            } else if (this.id === "csBtn") {
                openModal("csModal");
            }
        });
    });
}

/* Copy */
function setupCopyButton() {
    const copyBtn = document.querySelector(".copy-btn");
    if (copyBtn) {
        copyBtn.addEventListener("click", function () {
            const accountInfo = "농협 352-837-294** / 예금주: 구름몰";
            navigator.clipboard
                .writeText(accountInfo)
                .then(() => {
                    const originalText = this.textContent;
                    this.textContent = "복사됨!";
                    this.style.backgroundColor = "var(--accent-green)";
                    setTimeout(() => {
                        this.textContent = originalText;
                        this.style.backgroundColor = "var(--neon-blue)";
                    }, 2000);
                })
                .catch((err) => {
                    console.error("복사 실패:", err);
                    const textarea = document.createElement("textarea");
                    textarea.value = accountInfo;
                    document.body.appendChild(textarea);
                    textarea.select();
                    try {
                        document.execCommand("copy");
                        const originalText = this.textContent;
                        this.textContent = "복사됨!";
                        this.style.backgroundColor = "var(--accent-green)";
                        setTimeout(() => {
                            this.textContent = originalText;
                            this.style.backgroundColor = "var(--neon-blue)";
                        }, 2000);
                    } catch (err) {
                        console.error("대체 복사 방법 실패:", err);
                    }
                    document.body.removeChild(textarea);
                });
        });
    }
}

/* 2. 충전 페이지 계좌 발급 로직 */
function setupAccountVerification() {
    const verifyBtn = document.getElementById("verifyAccountBtn");
    const pwWrap = document.getElementById("accountPwWrap");
    const pwInput = document.getElementById("accountCheckPassword");
    const accountResult = document.getElementById("accountResult");

    window.isAccountVerified = false;

    verifyBtn.addEventListener("click", () => {
        if (window.isAccountVerified) {
            navigator.clipboard.writeText(currentDepositAccount);
            verifyBtn.textContent = "복사됨!";
            setTimeout(() => (verifyBtn.textContent = "복사"), 1500);
            return;
        }
        pwWrap.style.display = "block";
        pwInput.focus();
    });

    // ⭐ 여기서부터가 핵심! (로그인 비밀번호로 인증)
    document.getElementById("accountPwConfirmBtn").addEventListener("click", async () => {
        const password = pwInput.value.trim();
        if (!password) return alert("비밀번호를 입력하세요");

        const user = firebase.auth().currentUser;
        if (!user) {
            alert("로그인이 필요합니다.");
            return;
        }
        try {
            // **firebase 비밀번호 재인증**
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email, // 가입시 아이디@yourdomain.com 형태
                password // 입력받은 비밀번호
            );
            await user.reauthenticateWithCredential(credential);

            // 인증 성공 → 계좌 정보 노출
            accountResult.textContent = currentDepositAccount;
            pwWrap.style.display = "none";
            window.isAccountVerified = true;
            verifyBtn.textContent = "복사";
        } catch (e) {
            alert("비밀번호가 일치하지 않습니다");
            pwInput.value = "";
        }
    });
}

/* 4. 배너 슬라이드 기능 */
function setupBannerSlider() {
    const banners = document.querySelectorAll(".banner img");
    const indicatorsContainer = document.querySelector(".banner-indicators");
    let currentIndex = 0;
    let interval;

    // 1) 인디케이터 동적 생성
    banners.forEach((_, index) => {
        const indicator = document.createElement("span");
        indicator.classList.add("banner-indicator");
        if (index === 0) indicator.classList.add("active");
        indicator.addEventListener("click", () => {
            clearInterval(interval);
            showBanner(index);
            startAutoSlide();
        });
        indicatorsContainer.appendChild(indicator);
    });
    const indicators = indicatorsContainer.querySelectorAll(".banner-indicator");

    // 2) 특정 배너 활성화 함수
    function showBanner(index) {
        banners.forEach((banner, i) => {
            banner.classList.toggle("active", i === index);
        });
        indicators.forEach((ind, i) => {
            ind.classList.toggle("active", i === index);
        });
        currentIndex = index;
    }

    // 3) 다음/이전 배너
    function nextBanner() {
        showBanner((currentIndex + 1) % banners.length);
    }
    function prevBanner() {
        showBanner((currentIndex - 1 + banners.length) % banners.length);
    }

    // 4) 4초마다 자동 슬라이드 시작
    function startAutoSlide() {
        interval = setInterval(nextBanner, 4000);
    }

    // 5) 화살표 클릭 시 자동 슬라이드 재시작
    document.getElementById("nextBanner")?.addEventListener("click", () => {
        clearInterval(interval);
        nextBanner();
        startAutoSlide();
    });
    document.getElementById("prevBanner")?.addEventListener("click", () => {
        clearInterval(interval);
        prevBanner();
        startAutoSlide();
    });

    // 초기화
    showBanner(0);
    startAutoSlide();
}

/* 관리자 관련 함수들 */
function showAdminPage() {
    document.getElementById("mainContainer").style.display = "none";
    document.getElementById("adminContainer").style.display = "block";
    loadUserData();
    loadAdminChatList();
    loadPendingApprovals();
}

function showMainPage() {
    document.getElementById("mainContainer").style.display = "block";
    document.getElementById("adminContainer").style.display = "none";

    // 관리자 채팅 구독 해제
    if (adminChatUnsubscribe) {
        adminChatUnsubscribe();
        adminChatUnsubscribe = null;
        currentAdminChatId = null;
    }
}

// Firebase에서 사용자 데이터 로드
async function loadUserData() {
    showLoading();
    try {
        const usersSnapshot = await db.collection("users").get();
        const usersData = [];

        let totalUsers = 0;
        let todayUsers = 0;
        let activeUsers = 0;
        let bannedUsers = 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        usersSnapshot.forEach((doc) => {
            const user = doc.data();
            user.id = doc.id;
            usersData.push(user);

            totalUsers++;

            if (user.joinDate && new Date(user.joinDate) >= today) {
                todayUsers++;
            }

            if (user.status === "active") {
                activeUsers++;
            } else if (user.status === "banned") {
                bannedUsers++;
            }
        });

        // 통계 업데이트
        document.getElementById("totalUsers").textContent = totalUsers;
        document.getElementById("todayUsers").textContent = todayUsers;
        document.getElementById("activeUsers").textContent = activeUsers;
        document.getElementById("bannedUsers").textContent = bannedUsers;

        // 테이블 렌더링
        await renderUserTable(usersData);
    } catch (error) {
        console.error("데이터 로드 중 오류:", error);
        alert("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
        hideLoading();
    }
}

// 사용자 UID로부터 사용자 이름/아이디를 가져오는 함수
async function getUsernameFromUid(uid) {
    try {
        const userDoc = await db.collection("users").doc(uid).get();
        if (userDoc.exists) {
            return userDoc.data().userId || userDoc.data().name || "알 수 없음";
        }
        return "알 수 없음";
    } catch (error) {
        console.error("사용자 정보 가져오기 오류:", error);
        return "알 수 없음";
    }
}

// 포인트 옵션 텍스트 변환 함수
function getPointOptionText(optionId) {
    const options = {
        option1: "카지노 롤링 100%",
        option2: "슬롯 첫충 10% 매충 5%",
        option3: "포인트 미지급",
    };
    return options[optionId] || optionId;
}

async function renderUserTable(users) {
    const tableBody = document.getElementById("userTableBody");
    tableBody.innerHTML = "";

    const searchTerm = document.getElementById("userSearch").value.toLowerCase();
    const filteredUsers = searchTerm ? users.filter((u) => (u.name && u.name.toLowerCase().includes(searchTerm)) || (u.userId && u.userId.toLowerCase().includes(searchTerm))) : users;

    if (filteredUsers.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="8" style="text-align:center;">검색 결과가 없습니다</td>`;
        tableBody.appendChild(row);
        return;
    }

    filteredUsers.forEach((user) => {
        const row = document.createElement("tr");

        if (user.status === "banned") row.style.opacity = "0.6";
        if (user.isAdmin) row.style.backgroundColor = "rgba(0,170,255,.1)";

        row.innerHTML = `
            <td>${esc(user.name) || ""} ${user.isAdmin ? "(관리자)" : ""}</td>
            <td>${esc(user.userId) || ""}</td>
            <td>
                <input type="number" class="balance-input"
                       value="${user.balance || 0}"
                       data-userid="${user.id}"
                       data-type="balance"
                       onchange="updateUserBalance('${user.id}', this.value)">
            </td>
            <td>
                <input type="number" class="balance-input"
                       value="${user.point || 0}"
                       data-userid="${user.id}"
                       data-type="point"
                       onchange="updateUserBalance('${user.id}', this.value, 'point')">
            </td>
            <td>${user.joinDate || ""}</td>
            <td>
                <select class="user-status" data-userid="${user.id}">
                    <option value="active" ${user.status === "active" ? "selected" : ""}>활성</option>
                    <option value="banned" ${user.status === "banned" ? "selected" : ""}>정지</option>
                    <option value="pending" ${user.status === "pending" ? "selected" : ""} disabled>승인대기</option>
                </select>
            </td>
            <td>
                <button class="admin-action-btn info" data-uid="${user.id}">정보</button>
                ${
                    !user.isAdmin
                        ? `
                    <button class="admin-action-btn block-ip" data-userid="${user.id}" data-ip="${user.ipAddress || ""}">IP 차단</button>
                    <button class="admin-action-btn delete" data-userid="${user.id}">삭제</button>
                    <button class="admin-action-btn" onclick="resetPassword('${esc(user.userId)}')">
                        비밀번호 초기화
                    </button>
                `
                        : "관리자"
                }
            </td>
        `;
        tableBody.appendChild(row);
    });

    // 상태 변경
    document.querySelectorAll(".user-status").forEach((sel) => sel.addEventListener("change", () => updateUserStatus(sel.dataset.userid, sel.value)));

    // 삭제
    document.querySelectorAll(".admin-action-btn.delete").forEach((btn) =>
        btn.addEventListener("click", () => {
            if (confirm("정말로 이 사용자를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) {
                deleteUser(btn.dataset.userid);
            }
        })
    );

    // 정보
    tableBody.querySelectorAll(".admin-action-btn.info").forEach((btn) => btn.addEventListener("click", (e) => viewUserInfoByUid(e.currentTarget.dataset.uid)));

    // IP 차단
    document.querySelectorAll(".block-ip").forEach((btn) => {
        btn.addEventListener("click", () => blockUserIp(btn.dataset.userid, btn.dataset.ip));
    });
}

async function getClientIp() {
    // 무료 API 사용(상용은 유료로 변경 가능)
    try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        return data.ip;
    } catch {
        return "알 수 없음";
    }
}

// 회원가입 시
document.getElementById("registerSubmit").addEventListener("click", async function () {
    // ... (기존 회원가입 입력값 처리)
    // 1) IP 먼저 가져오기
    const ipAddress = await getClientIp();

    // 2) 가입시 Firestore에 IP도 함께 저장
    const userData = {
        // ...기존 필드
        ipAddress: ipAddress,
    };
    await db.collection("users").doc(userCredential.user.uid).set(userData);
    // ...
});

async function blockUserIp(userId, ipAddress) {
    if (!ipAddress || ipAddress === "알 수 없음") {
        alert("유효한 IP 주소가 없습니다.");
        return;
    }
    if (!confirm(`정말로 ${ipAddress} 주소를 차단하시겠습니까?\n이 IP의 모든 사용자가 접속할 수 없게 됩니다.`)) {
        return;
    }
    showLoading();
    try {
        // 차단 목록에 등록
        await db.collection("blockedIps").doc(ipAddress).set({
            ip: ipAddress,
            blockedAt: new Date().toISOString(),
            blockedBy: auth.currentUser.uid,
            userId: userId,
        });
        alert("IP 주소가 성공적으로 차단되었습니다.");
        loadUserData();
    } catch (error) {
        console.error("IP 차단 오류:", error);
        alert(`IP 차단 실패: ${error.message}`);
    } finally {
        hideLoading();
    }
}

async function isLikelyVpn(ipAddress) {
    try {
        const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
        const data = await response.json();
        // org/orgName/orgDisplayName 등에 'vpn', 'proxy', 'hosting'이 포함되면 우회로 간주
        if (data.org && (data.org.toLowerCase().includes("vpn") || data.org.toLowerCase().includes("proxy") || data.org.toLowerCase().includes("hosting"))) {
            return true;
        }
        return false;
    } catch (error) {
        // 오류 발생 시 false 반환 (감지 불가)
        return false;
    }
}

async function detectAndBlockVpn(ipAddress) {
    if (!ipAddress || ipAddress === "알 수 없음") {
        return false;
    }

    // 무료 API로 변경 (실제 서비스에서는 유료 API 권장)
    try {
        // IPAPI를 사용한 기본 정보 조회 (무료)
        const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
        const data = await response.json();

        // 프록시/VPN 간접 감지 (정확한 VPN 감지는 유료 API 필요)
        const isLikelyVpn = data.org && (data.org.toLowerCase().includes("vpn") || data.org.toLowerCase().includes("proxy") || data.org.toLowerCase().includes("hosting"));

        return isLikelyVpn;
    } catch (error) {
        console.error("IP 정보 조회 오류:", error);
        return false;
    }
}

// Helper 함수들
function getUserIdFromUid(uid) {
    return "user_" + uid.substring(0, 5);
}

function getPointOptionText(optionId) {
    const options = {
        option1: "카지노 롤링 100%",
        option2: "슬롯 첫충 10% 매충 5%",
        option3: "포인트 미지급",
    };
    return options[optionId] || optionId;
}

function debounce(func, wait) {
    let timeout;
    return function () {
        const context = this,
            args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

// 사용자 테이블 행에 애니메이션 추가
function addUserToTable(user, tableBody) {
    const row = document.createElement("tr");
    row.style.opacity = "0";
    row.style.transform = "translateY(20px)";

    // 행 내용 추가 (기존 코드 유지)

    tableBody.appendChild(row);

    // 애니메이션 적용
    setTimeout(() => {
        row.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        row.style.opacity = "1";
        row.style.transform = "translateY(0)";
    }, 10);
}

function setupAdminTabs() {
    const tabs = document.querySelectorAll(".admin-tab");
    tabs.forEach((tab) => {
        tab.addEventListener("click", function () {
            // 모든 탭 비활성화
            document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));

            // 현재 탭 활성화
            this.classList.add("active");
            const tabId = this.getAttribute("data-tab") + "Tab";
            document.getElementById(tabId).classList.add("active");

            // 검색 박스는 회원 관리 탭에서만 표시
            const searchBox = document.querySelector(".search-box");
            if (tabId === "usersTab") {
                searchBox.style.display = "block";
            } else {
                searchBox.style.display = "none";
            }

            // 탭별 데이터 로드
            switch (this.getAttribute("data-tab")) {
                case "users":
                    loadUserData();
                    break;
                case "charges":
                    loadChargeRequests();
                    break;
                case "exchanges":
                    loadExchangeRequests();
                    break;
                case "approvals":
                    loadPendingApprovals(); // 가입승인 탭 클릭 시 호출
                    break;
                case "chats":
                    loadAdminChatList();
                    break;
                case "account":
                    loadDepositAccount();
                    break;
            }
        });
    });

    // 초기 검색 박스 설정
    document.querySelector(".search-box").style.display = "block";
}

async function loadChargeRequests() {
    const tbody = document.getElementById("chargeRequestsBody");
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">로드 중...</td></tr>';

    try {
        const querySnapshot = await db.collection("chargeRequests").where("status", "==", "pending").orderBy("date", "desc").get();

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">처리할 충전 신청이 없습니다</td></tr>';
            return;
        }

        tbody.innerHTML = "";
        const requestsWithUsernames = await Promise.all(
            querySnapshot.docs.map(async (doc) => {
                const request = doc.data();
                const username = await getUsernameFromUid(request.userId);
                return { id: doc.id, ...request, username };
            })
        );

        requestsWithUsernames.forEach((request) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${request.username}</td>
                <td>${request.amount.toLocaleString()}원</td>
                <td>${new Date(request.date).toLocaleString()}</td>
                <td>${getPointOptionText(request.pointOption)}</td>
                <td>
                    <button class="admin-action-btn approve" 
                        data-requestid="${request.id}" 
                        data-userid="${request.userId}" 
                        data-amount="${request.amount}">승인</button>
                    <button class="admin-action-btn reject" 
                        data-requestid="${request.id}">거절</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // 승인/거절 버튼 이벤트 리스너 추가
        document.querySelectorAll(".approve").forEach((btn) => {
            btn.addEventListener("click", approveChargeRequest);
        });
        document.querySelectorAll(".reject").forEach((btn) => {
            btn.addEventListener("click", rejectChargeRequest);
        });
    } catch (error) {
        console.error("충전 신청 목록 로드 오류:", error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">데이터를 불러오는 중 오류 발생</td></tr>';
    }
}

/* 충전 요청 승인 */
async function approveChargeRequest(e) {
    const requestId = e.target.dataset.requestid;
    const userId = e.target.dataset.userid;
    const amount = parseInt(e.target.dataset.amount);

    if (!confirm(`정말로 이 충전 신청(${amount.toLocaleString()}원)을 승인하시겠습니까?`)) {
        return;
    }

    showLoading();
    try {
        // 1. 충전 요청 상태 업데이트
        await db.collection("chargeRequests").doc(requestId).update({
            status: "approved",
            processedDate: new Date().toISOString(),
            adminNote: "관리자 승인 완료",
        });

        // 2. 사용자 잔액 업데이트
        const userRef = db.collection("users").doc(userId);
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new Error("사용자를 찾을 수 없습니다");

            const currentBalance = userDoc.data().balance || 0;
            transaction.update(userRef, {
                balance: currentBalance + amount,
            });
        });

        alert("충전이 승인되었습니다.");
        loadUserData(); // 페이지 새로고침
    } catch (error) {
        console.error("충전 승인 오류:", error);
        alert("충전 승인 중 오류가 발생했습니다: " + error.message);
    } finally {
        hideLoading();
    }
}

/* 충전 요청 거절 */
async function rejectChargeRequest(e) {
    const requestId = e.target.dataset.requestid;
    const reason = prompt("거절 사유를 입력해주세요:", "정보 불일치");

    if (!reason) return;

    if (!confirm(`이 충전 신청을 거절하시겠습니까? 사유: ${reason}`)) {
        return;
    }

    showLoading();
    try {
        await db.collection("chargeRequests").doc(requestId).update({
            status: "rejected",
            processedDate: new Date().toISOString(),
            adminNote: reason,
        });

        alert("충전 신청이 거절되었습니다.");
        loadUserData(); // 페이지 새로고침
    } catch (error) {
        console.error("충전 거절 오류:", error);
        alert("충전 거절 중 오류가 발생했습니다: " + error.message);
    } finally {
        hideLoading();
    }
}

async function updateUserBalance(userId, value, type = "balance") {
    if (isNaN(value) || value < 0) {
        alert("유효한 금액을 입력해주세요.");
        return;
    }

    showLoading();
    try {
        await db
            .collection("users")
            .doc(userId)
            .update({
                [type]: Number(value),
            });
        console.log(`${type} 업데이트 성공`);
    } catch (error) {
        console.error(`${type} 업데이트 중 오류:`, error);
        alert(`${type} 업데이트에 실패했습니다.`);
    } finally {
        hideLoading();
    }
}

function setupExchangeTabs() {
    const tabs = document.querySelectorAll(".exchange-tab");
    tabs.forEach((tab) => {
        tab.addEventListener("click", function () {
            document.querySelectorAll(".exchange-tab").forEach((t) => t.classList.remove("active"));
            this.classList.add("active");

            const tabType = this.getAttribute("data-tab");
            document.querySelectorAll(".exchange-tab-content").forEach((content) => {
                content.classList.remove("active");
            });

            if (tabType === "request") {
                document.getElementById("exchangeRequestTab").classList.add("active");
                updateUserBalanceDisplay(); // 잔액 업데이트
            } else if (tabType === "history") {
                document.getElementById("exchangeHistoryTab").classList.add("active");
                loadExchangeHistory();
            }
        });
    });
}

// 사용자 잔액 표시 업데이트
async function updateUserBalanceDisplay() {
    const user = auth.currentUser;
    if (!user) return;

    const balanceElement = document.getElementById("currentBalance");
    if (!balanceElement) return; // 요소가 없으면 종료

    try {
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (userDoc.exists) {
            const balance = userDoc.data().balance || 0;
            balanceElement.textContent = balance.toLocaleString() + " 원";
        }
    } catch (error) {
        console.error("잔액 불러오기 오류:", error);
    }
}

// 환전 성공 알림
function showExchangeSuccessNotification(amount) {
    const notification = document.createElement("div");
    notification.className = "exchange-success-notification";
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        ${parseInt(amount).toLocaleString()}원 환전 신청 완료!
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = "0";
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// 환전 내역 로드
function loadExchangeHistory() {
    const historyList = document.getElementById("exchangeHistoryList");
    const user = auth.currentUser;

    if (!user) {
        historyList.innerHTML = '<div class="no-history">로그인이 필요합니다</div>';
        return;
    }

    showLoading();
    db.collection("exchangeRequests")
        .where("userId", "==", user.uid)
        .orderBy("date", "desc")
        .get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                historyList.innerHTML = '<div class="no-history">환전 내역이 없습니다</div>';
                return;
            }

            historyList.innerHTML = "";
            querySnapshot.forEach((doc) => {
                const item = doc.data();
                const historyItem = document.createElement("div");
                historyItem.className = "exchange-history-item";

                let statusClass = "status-pending";
                let statusText = "대기중";

                if (item.status === "approved") {
                    statusClass = "status-completed";
                    statusText = "승인됨";
                } else if (item.status === "rejected") {
                    statusClass = "status-rejected";
                    statusText = "거절됨: " + (item.adminNote || "");
                } else if (item.status === "completed") {
                    statusClass = "status-completed";
                    statusText = "처리완료";
                }

                historyItem.innerHTML = `
                    <span>${new Date(item.date).toLocaleString()}</span>
                    <span>${item.amount.toLocaleString()}원</span>
                    <span class="exchange-status ${statusClass}">${statusText}</span>
                `;
                historyList.appendChild(historyItem);
            });
        })
        .catch((error) => {
            console.error("환전 내역 로드 오류:", error);
            historyList.innerHTML = '<div class="no-history">내역을 불러오는 중 오류 발생</div>';
        })
        .finally(() => hideLoading());
}

// 관리자 환전 요청 관리
async function loadExchangeRequests() {
    const tbody = document.getElementById("exchangeRequestsBody");
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">로드 중...</td></tr>';

    try {
        const querySnapshot = await db.collection("exchangeRequests").where("status", "==", "pending").orderBy("date", "asc").get();

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">처리할 환전 신청이 없습니다</td></tr>';
            return;
        }

        tbody.innerHTML = "";
        const requestsWithUsernames = await Promise.all(
            querySnapshot.docs.map(async (doc) => {
                const request = doc.data();
                const username = await getUsernameFromUid(request.userId);
                return { id: doc.id, ...request, username };
            })
        );

        requestsWithUsernames.forEach((request) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${request.username}</td>
                <td>${request.amount.toLocaleString()}원</td>
                <td>${request.bank}</td>
                <td>${request.account}</td>
                <td>${request.accountName}</td>
                <td>
                    <button class="admin-action-btn complete" 
                        data-requestid="${request.id}" 
                        data-userid="${request.userId}" 
                        data-amount="${request.amount}">완료</button>
                    <button class="admin-action-btn reject" 
                        data-requestid="${request.id}">거절</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // 완료/거절 버튼 이벤트 리스너 추가
        document.querySelectorAll(".complete").forEach((btn) => {
            btn.addEventListener("click", completeExchangeRequest);
        });
        document.querySelectorAll(".reject").forEach((btn) => {
            btn.addEventListener("click", rejectExchangeRequest);
        });
    } catch (error) {
        console.error("환전 신청 목록 로드 오류:", error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">데이터를 불러오는 중 오류 발생</td></tr>';
    }
}

// 환전 요청 완료 처리
async function completeExchangeRequest(e) {
    const requestId = e.target.dataset.requestid;
    const userId = e.target.dataset.userid;
    const amount = parseInt(e.target.dataset.amount);

    if (!confirm(`이 환전 신청(${amount.toLocaleString()}원)을 완료 처리하시겠습니까?`)) {
        return;
    }

    showLoading();
    try {
        await db.collection("exchangeRequests").doc(requestId).update({
            status: "completed",
            processedDate: new Date().toISOString(),
            adminNote: "환전 처리 완료",
        });

        alert("환전이 완료 처리되었습니다.");
        loadExchangeRequests();
    } catch (error) {
        console.error("환전 완료 처리 오류:", error);
        alert("환전 완료 처리 중 오류가 발생했습니다: " + error.message);
    } finally {
        hideLoading();
    }
}

// 환전 요청 거절 처리
async function rejectExchangeRequest(e) {
    const requestId = e.target.dataset.requestid;
    const reason = prompt("거절 사유를 입력해주세요:", "정보 불일치");

    if (!reason) return;

    if (!confirm(`이 환전 신청을 거절하시겠습니까? 사유: ${reason}`)) {
        return;
    }

    showLoading();
    try {
        // 1. 환전 요청 상태 업데이트
        const requestDoc = await db.collection("exchangeRequests").doc(requestId).get();
        const requestData = requestDoc.data();

        await db.runTransaction(async (transaction) => {
            // 2. 사용자 잔액 환급
            const userRef = db.collection("users").doc(requestData.userId);
            const userDoc = await transaction.get(userRef);

            if (userDoc.exists) {
                const currentBalance = userDoc.data().balance || 0;
                transaction.update(userRef, {
                    balance: currentBalance + requestData.amount,
                });
            }

            // 3. 환전 요청 상태 업데이트
            transaction.update(db.collection("exchangeRequests").doc(requestId), {
                status: "rejected",
                processedDate: new Date().toISOString(),
                adminNote: reason,
            });
        });

        alert("환전 신청이 거절되었습니다.");
        loadExchangeRequests();
    } catch (error) {
        console.error("환전 거절 오류:", error);
        alert("환전 거절 중 오류가 발생했습니다: " + error.message);
    } finally {
        hideLoading();
    }
}

// 환전 신청 처리
/* 환전 신청 처리 */
function setupExchangeSubmit() {
    // 헬퍼: 문자열에서 숫자만 남기기
    const onlyDigits = (str = "") => str.replace(/[^0-9]/g, "");

    document.getElementById("submitExchangeBtn").addEventListener("click", async function () {
        /* ---------- 1) 금액 추출 ---------- */
        const rawInput = document.getElementById("customExchangeAmount").value;
        const activeBtnText = document.querySelector(".amount-btn.active")?.textContent || "";
        const amountStr = onlyDigits(rawInput) || onlyDigits(activeBtnText);
        const amountNum = parseInt(amountStr, 10);

        /* ---------- 2) 기본 유효성 검사 ---------- */
        if (!amountNum) {
            alert("유효한 금액을 입력해주세요.");
            return;
        }
        if (amountNum < 10000) {
            alert("최소 10,000원 이상 환전 가능합니다.");
            return;
        }
        if (amountNum % 10000 !== 0) {
            alert("10,000원 단위로만 환전 가능합니다.");
            return;
        }

        /* ---------- 3) 추가 입력값 검사 ---------- */
        const bank = document.getElementById("exchangeBank").value;
        const account = document.getElementById("exchangeAccount").value;
        const accountName = document.getElementById("exchangeAccountName").value;
        const password = document.getElementById("exchangePassword").value;

        if (!bank || !account || !accountName || !password) {
            alert("모든 필수 항목을 입력해주세요.");
            return;
        }

        /* ---------- 4) 파이어스토어 트랜잭션 ---------- */
        showLoading();
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("로그인이 필요합니다");

            const userDoc = await db.collection("users").doc(user.uid).get();
            if (!userDoc.exists) throw new Error("사용자 정보를 찾을 수 없습니다");

            // 출금 비밀번호 확인
            if (!bcrypt.compareSync(password, userDoc.data().withdrawPassword)) {
                throw new Error("출금 비밀번호가 일치하지 않습니다");
            }

            // 잔액 확인
            const currentBalance = userDoc.data().balance || 0;
            if (currentBalance < amountNum) throw new Error("보유금액이 부족합니다");

            // 환전 데이터 객체
            const exchangeData = {
                userId: user.uid,
                userName: userDoc.data().name || userDoc.data().userId,
                amount: amountNum,
                bank: bank,
                account: account,
                accountName: accountName,
                date: new Date().toISOString(),
                status: "pending",
                adminNote: "",
                processedDate: null,
            };

            // 1) 잔액 차감 + 2) 환전 요청 등록
            await db.runTransaction(async (tx) => {
                tx.update(db.collection("users").doc(user.uid), {
                    balance: currentBalance - amountNum,
                });
                const exchangeRef = db.collection("exchangeRequests").doc();
                tx.set(exchangeRef, exchangeData);
            });

            /* ---------- 5) 성공 후 UI 초기화 ---------- */
            showExchangeSuccessNotification(amountNum);
            document.getElementById("customExchangeAmount").value = "";
            document.querySelectorAll(".amount-btn").forEach((b) => b.classList.remove("active"));
            document.getElementById("exchangePassword").value = "";
            updateUserBalanceDisplay();
            loadExchangeHistory();
        } catch (error) {
            console.error("환전 신청 오류:", error);
            alert("환전 신청 중 오류가 발생했습니다: " + error.message);
        } finally {
            hideLoading();
        }
    });
}

async function updateUserStatus(userId, status) {
    showLoading();
    try {
        await db.collection("users").doc(userId).update({
            status: status,
        });
        alert("사용자 상태가 업데이트되었습니다.");
        loadUserData(); // 테이블 새로고침
    } catch (error) {
        console.error("사용자 상태 업데이트 중 오류:", error);
        alert("사용자 상태 업데이트에 실패했습니다.");
    } finally {
        hideLoading();
    }
}

async function deleteUser(userId) {
    showLoading();
    try {
        await db.collection("users").doc(userId).delete();
        alert("사용자가 삭제되었습니다.");
        loadUserData(); // 테이블 새로고침
    } catch (error) {
        console.error("사용자 삭제 중 오류:", error);
        alert("사용자 삭제에 실패했습니다.");
    } finally {
        hideLoading();
    }
}

async function resetPassword(userId) {
    if (confirm(`정말로 ${userId}의 비밀번호를 초기화하시겠습니까?`)) {
        showLoading();
        try {
            // Firebase 인증을 통해 비밀번호 재설정 이메일 보내기
            const user = await auth.getUserByEmail(userId + "@yourdomain.com");
            await auth.sendPasswordResetEmail(user.email);
            alert("비밀번호 재설정 이메일이 전송되었습니다.");
        } catch (error) {
            console.error("비밀번호 초기화 중 오류:", error);
            alert("비밀번호 초기화에 실패했습니다.");
        } finally {
            hideLoading();
        }
    }
}

/* Firebase Auth Functions */
function setupLogin() {
    document.getElementById("loginSubmit").addEventListener("click", async function () {
        const userId = document.getElementById("loginId").value.trim();
        const password = document.getElementById("loginPassword").value.trim();

        if (!userId || !password) {
            alert("아이디와 비밀번호를 입력해주세요.");
            return;
        }

        showLoading();
        try {
            // 1) 인증 시도
            const userCredential = await auth.signInWithEmailAndPassword(`${userId}@yourdomain.com`, password);
            const uid = userCredential.user.uid;

            // 2) Firestore에서 문서를 UID로 바로 조회
            const userRef = db.collection("users").doc(uid);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                // 가입은 돼 있지만 사용자 정보가 없을 때
                await auth.signOut();
                showBlockedPopup("등록되지 않은 사용자입니다.");
                return;
            }

            const u = userDoc.data();
            // 3) 상태에 따른 처리
            switch (u.status) {
                case "pending":
                    await auth.signOut();
                    showBlockedPopup("관리자 승인 대기 중입니다. 승인 후 이용 가능합니다.");
                    return;
                case "rejected":
                    await auth.signOut();
                    showBlockedPopup("가입이 거절된 계정입니다.");
                    return;
                case "banned":
                    await auth.signOut();
                    showBlockedPopup("정지된 계정입니다. 관리자에게 문의해주세요.");
                    return;
                // active는 정상 로그인
            }

            // 4) 정상 로그인 후 필요한 추가 처리 (IP 업데이트 등)
            updateAuthUI(u);
            closeModal("loginModal");
        } catch (error) {
            console.error("로그인 오류:", error);
            let errorMessage = "로그인 중 오류가 발생했습니다.";
            if (error.code === "auth/user-not-found") {
                errorMessage = "등록되지 않은 아이디입니다.";
            } else if (error.code === "auth/wrong-password") {
                errorMessage = "비밀번호가 일치하지 않습니다.";
            }
            showBlockedPopup(errorMessage);
        } finally {
            hideLoading();
        }
    });
}
/* ---------- 가입 승인 대기 목록 로드 ---------- */
function loadPendingApprovals() {
    const tbody = document.getElementById("pendingApprovalTable");
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">로드 중…</td></tr>';

    db.collection("approvalRequests")
        .where("status", "==", "pending")
        .orderBy("requestDate", "desc")
        .get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">승인 대기 회원이 없습니다</td></tr>';
                return;
            }

            tbody.innerHTML = "";
            querySnapshot.forEach((doc) => {
                const request = doc.data();
                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>${esc(request.userInfo.name)}</td>
                    <td>${esc(request.userInfo.userId)}</td>
                    <td>${new Date(request.userInfo.joinDate).toLocaleDateString()}</td>
                    <td>
                        <button class="admin-action-btn view-user"
                                data-userid="${esc(request.userInfo.userId)}"
                                data-uid="${request.userId}">정보</button>
                        <button class="admin-action-btn approve-user"
                                data-requestid="${doc.id}"
                                data-userid="${request.userId}">승인</button>
                        <button class="admin-action-btn reject-user"
                                data-requestid="${doc.id}"
                                data-userid="${request.userId}">거절</button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            // 버튼 이벤트 바인딩
            tbody.querySelectorAll(".view-user").forEach((btn) => {
                btn.addEventListener("click", (e) => {
                    viewUserInfoByUid(e.target.dataset.uid);
                });
            });

            tbody.querySelectorAll(".approve-user").forEach((btn) => {
                btn.addEventListener("click", approveUserRegistration);
            });

            tbody.querySelectorAll(".reject-user").forEach((btn) => {
                btn.addEventListener("click", rejectUserRegistration);
            });
        })
        .catch((error) => {
            console.error("승인 목록 로드 오류:", error);
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">불러오기 실패</td></tr>';
        });
}

/* ---------- 정보 모달 열기 ---------- */
/* ───────── 가입 승인 탭: 정보 모달 ───────── */
async function viewUserInfo(e) {
    const userId = e.target.dataset.userid; // 행에서 넘어온 사용자 아이디
    if (!userId) return;

    showLoading();
    try {
        /* ① Firestore에서 userId로 사용자 1건 조회 */
        const qs = await db.collection("users").where("userId", "==", userId).limit(1).get();

        if (qs.empty) {
            alert("사용자 정보를 찾을 수 없습니다.");
            return;
        }

        const u = qs.docs[0].data();

        /* ② 아바타 (photoURL 없으면 기본 아이콘) */
        document.getElementById("infoAvatar").src = u.photoURL || DEFAULT_AVATAR_URL;

        /* ③ 상태 뱃지 텍스트 + 색상 */
        const st = document.getElementById("infoStatus");
        st.textContent = u.status === "active" ? "ACTIVE" : "BANNED";
        st.className = "status-badge " + (u.status === "active" ? "status-active" : "status-banned");

        /* ④ 나머지 필드 채우기 (esc 함수로 XSS 방지) */
        document.getElementById("infoName").innerText = esc(u.name);
        document.getElementById("infoUserId").innerText = esc(u.userId);
        document.getElementById("infoJoinDate").innerText = new Date(u.joinDate).toLocaleString();
        document.getElementById("infoBalance").innerText = (u.balance || 0).toLocaleString() + " 원";
        document.getElementById("infoPoint").innerText = (u.point || 0).toLocaleString() + " P";
        document.getElementById("infoBank").innerText = esc(u.bank);
        document.getElementById("infoAccount").innerText = esc(u.account);
        document.getElementById("infoAccountName").innerText = esc(u.accountName);

        /* ⑤ 모달 열기 */
        openModal("userInfoModal");
    } catch (err) {
        console.error("회원 정보 조회 오류:", err);
        alert("정보를 불러오지 못했습니다: " + err.message);
    } finally {
        hideLoading();
    }
}

// ── 테더 팝업 모듈 ───────────────────────────────────────────────
// ── 테더 팝업 모듈 ───────────────────────────────────────────────
(function () {
    /* ① 요소 캐싱 */
    const popup = document.getElementById("tetherPopup");
    const close = popup.querySelector(".popup__close");
    const today = popup.querySelector("#dontShowToday");
    const HIDE_KEY = "hideTetherPopupUntil";
    const DEFAULT_IMG = "https://i.ibb.co/rKtvvcRD/6075767806617567488.jpg"; // HTML에 정의된 기본 이미지 URL 사용
    const imgEl = popup.querySelector(".popup__image");
    /* ② 팝업 표시 조건 & 헬퍼 */
    const todayStr = () => new Date().toISOString().slice(0, 10);
    const shouldHide = () => localStorage.getItem(HIDE_KEY) === todayStr();
    const rememberToday = () => localStorage.setItem(HIDE_KEY, todayStr());

    /* ③ 팝업 열기 함수 (전역 export) */
    window.openTetherPopup = function (url) {
        if (shouldHide()) return; // 금일 숨김 처리된 상태라면 패스

        // URL 유효성 검사 수정: url이 없으면 기본 이미지 사용
        if (url && !/^https?:\/\/.+\.(png|jpe?g|gif|webp|svg)$/i.test(url)) {
            console.error("올바른 이미지 URL을 입력하세요.");
            return;
        }

        imgEl.src = url || DEFAULT_IMG; // URL이 없으면 기본 이미지 사용
        popup.style.display = "flex";
    };

    /* ④ 닫기 + 오늘 하루 보지 않기 처리 */
    const hide = () => {
        if (today.checked) rememberToday(); // 체크 돼 있으면 로컬스토리지 기록
        popup.style.display = "none";
    };
    close.addEventListener("click", hide);
    popup.addEventListener("click", (e) => {
        if (e.target === popup) hide();
    });

    /* ⑤ 페이지 진입 직후 자동 실행 */
    window.addEventListener("load", () => {
        if (!shouldHide()) {
            // 기본 이미지로 팝업 열기 (URL 파라미터 없이 호출)
            openTetherPopup();
        }
    });
})();
/* ---------- UID 기반 사용자 정보 조회 & 모달 표시 ---------- */
// 2) viewUserInfoByUid(): 승인 대기 중인 유저도 IP·VPN 정보를 실시간 조회해 표시
async function viewUserInfoByUid(uid) {
    showLoading();
    try {
        // 1. 사용자 Firestore 문서 읽기
        const doc = await db.collection("users").doc(uid).get();
        if (!doc.exists) throw new Error("사용자 정보를 찾을 수 없습니다.");
        const u = doc.data();

        // 2. IP 주소 표시
        let ipAddress = u.ipAddress || "";
        if (!ipAddress) {
            try {
                // IP가 없다면 현재 IP 조회 후 Firestore에 저장
                const res = await fetch("https://api.ipify.org?format=json");
                const data = await res.json();
                ipAddress = data.ip;
                await db.collection("users").doc(uid).update({ ipAddress });
            } catch {
                ipAddress = "알 수 없음";
            }
        }
        document.getElementById("infoIpAddress").innerText = ipAddress;

        // 3. VPN 탐지 결과 표시
        const vpnEl = document.getElementById("infoVpnStatus");
        if (ipAddress !== "알 수 없음") {
            try {
                const isVpn = await isLikelyVpn(ipAddress);
                vpnEl.innerText = isVpn ? "감지됨 (VPN/프록시 가능성)" : "감지되지 않음";
                vpnEl.style.color = isVpn ? "var(--accent-red)" : "";
            } catch {
                vpnEl.innerText = "확인 불가";
                vpnEl.style.color = "";
            }
        } else {
            vpnEl.innerText = "알 수 없음";
            vpnEl.style.color = "";
        }

        // 4. 나머지 사용자 정보 표시 (이름, UID 등)
        document.getElementById("infoAvatar").src = u.photoURL || DEFAULT_AVATAR_URL;
        document.getElementById("infoName").innerText = esc(u.name);
        document.getElementById("infoUserId").innerText = esc(u.userId);
        document.getElementById("infoJoinDate").innerText = new Date(u.joinDate).toLocaleString();
        document.getElementById("infoBalance").innerText = (u.balance || 0).toLocaleString() + " 원";
        document.getElementById("infoPoint").innerText = (u.point || 0).toLocaleString() + " P";
        document.getElementById("infoBank").innerText = esc(u.bank);
        document.getElementById("infoAccount").innerText = esc(u.account);
        document.getElementById("infoAccountName").innerText = esc(u.accountName);

        // 상태 뱃지
        const st = document.getElementById("infoStatus");
        st.textContent = u.status === "active" ? "ACTIVE" : u.status.toUpperCase();
        st.className = "status-badge " + (u.status === "active" ? "status-active" : "status-banned");

        openModal("userInfoModal");
    } catch (err) {
        console.error("회원 정보 조회 오류:", err);
        alert("정보를 불러오는 중 오류가 발생했습니다: " + err.message);
    } finally {
        hideLoading();
    }
}

async function approveUserRegistration(e) {
    const requestId = e.target.dataset.requestid;
    const userId = e.target.dataset.userid;

    if (!confirm("이 사용자의 가입을 승인하시겠습니까?")) return;

    showLoading();

    try {
        // 1. 승인 요청 문서 업데이트
        await db.collection("approvalRequests").doc(requestId).update({
            status: "approved",
            processedDate: new Date().toISOString(),
            processedBy: auth.currentUser.uid,
        });

        // 2. users 컬렉션에서 해당 사용자 상태 업데이트
        await db.collection("users").doc(userId).update({
            status: "active",
            approvedAt: new Date().toISOString(),
        });

        alert("사용자 가입이 승인되었습니다.");
        loadPendingApprovals();
    } catch (error) {
        console.error("가입 승인 오류:", error);
        alert("승인 실패: " + error.message);
    } finally {
        hideLoading();
    }
}

async function rejectUserRegistration(e) {
    const requestId = e.target.dataset.requestid;
    const userId = e.target.dataset.userid;
    const reason = prompt("거절 사유를 입력해주세요 (사용자 계정이 완전히 삭제됩니다):", "정보 불충분");

    if (!reason) return;

    if (!confirm(`이 사용자의 가입을 완전히 거절하시겠습니까?\n\n사유: ${reason}\n\n※ 주의: 이 작업은 되돌릴 수 없으며 모든 사용자 데이터가 삭제됩니다.`)) {
        return;
    }

    showLoading();

    try {
        // 트랜잭션으로 안전하게 처리
        await db.runTransaction(async (transaction) => {
            // 1. 승인 요청 문서 삭제
            const requestRef = db.collection("approvalRequests").doc(requestId);
            transaction.delete(requestRef);

            // 2. 사용자 문서 삭제
            const userRef = db.collection("users").doc(userId);
            transaction.delete(userRef);

            // 3. Firebase Authentication에서 사용자 삭제 (클라이언트에서는 불가능, 서버 함수 필요)
            // 실제 구현시에는 Cloud Function을 호출해야 함
        });

        alert("사용자 가입이 완전히 거절되었습니다. 모든 데이터가 삭제되었습니다.");

        // 목록 새로고침
        loadPendingApprovals();
        loadUserData();
    } catch (error) {
        console.error("가입 거절 오류:", error);
        alert(`가입 거절 중 오류가 발생했습니다: ${error.message}\n\n자세한 내용은 콘솔을 확인해주세요.`);
    } finally {
        hideLoading();
    }
}

// 기존 코드에 추가할 터치 이벤트 핸들러
function setupMobileTouchEvents() {
    // 탭 메뉴 터치 영역 확대
    document.querySelectorAll(".admin-tab").forEach((tab) => {
        tab.style.minWidth = "80px";
        tab.style.padding = "15px 20px";
    });

    // 버튼 터치 영역 확대
    document.querySelectorAll(".admin-action-btn").forEach((btn) => {
        btn.style.minHeight = "40px";
        btn.style.padding = "10px 15px";
    });

    // 테이블 행 터치 피드백
    document.querySelectorAll(".user-table tr").forEach((row) => {
        row.style.transition = "background-color 0.2s";
        row.addEventListener("touchstart", function () {
            this.style.backgroundColor = "rgba(0, 170, 255, 0.1)";
        });
        row.addEventListener("touchend", function () {
            this.style.backgroundColor = "";
        });
    });
}

// 출금 비밀번호 확인 함수(예시)
async function checkWithdrawPassword(inputPassword) {
    const user = auth.currentUser;
    if (!user) {
        alert("로그인이 필요합니다.");
        return false;
    }
    const userDoc = await db.collection("users").doc(user.uid).get();
    if (!userDoc.exists) {
        alert("사용자 정보를 찾을 수 없습니다.");
        return false;
    }
    const savedHash = userDoc.data().withdrawPassword;
    // bcrypt로 비교!
    const isMatch = bcrypt.compareSync(inputPassword, savedHash);
    if (!isMatch) {
        alert("출금 비밀번호가 일치하지 않습니다");
        return false;
    }
    // 맞으면 true
    return true;
}

// 1) setupRegister(): 회원가입 시점에 IP 조회 → VPN 검사 → Firestore에 저장
function setupRegister() {
    // 회원가입 함수 예시 (생략 없이)
    document.getElementById("registerSubmit").addEventListener("click", async function () {
        // 입력값 받기
        const userId = document.getElementById("regId").value.trim();
        const password = document.getElementById("regPassword").value.trim();
        const passwordConfirm = document.getElementById("regPasswordConfirm").value.trim();
        const name = document.getElementById("regName").value.trim();
        const bank = document.getElementById("regBank").value;
        const account = document.getElementById("regAccount").value.trim();
        const accountName = document.getElementById("regAccountName").value.trim();
        const withdrawPassword = document.getElementById("withdrawPassword").value.trim();

        if (!userId || !password || !passwordConfirm || !name || !bank || !account || !accountName || !withdrawPassword) {
            alert("모든 필수 항목을 입력해주세요.");
            return;
        }
        if (password !== passwordConfirm) {
            alert("비밀번호가 일치하지 않습니다.");
            return;
        }
        if (password.length < 6) {
            alert("비밀번호는 6자 이상이어야 합니다.");
            return;
        }
        // 여기서 출금 비밀번호를 해시!
        const hashedWithdrawPassword = bcrypt.hashSync(withdrawPassword, 10);

        showLoading();
        try {
            // 1) Firebase Auth 회원가입 (로그인 비번은 자동 해시 저장됨)
            const userCredential = await auth.createUserWithEmailAndPassword(`${userId}@yourdomain.com`, password);
            await auth.signOut();

            // 2) Firestore 저장
            const userData = {
                userId,
                name,
                bank,
                account,
                accountName,
                balance: 0,
                point: 0,
                joinDate: new Date().toISOString(),
                status: "pending",
                isAdmin: false,
                withdrawPassword: hashedWithdrawPassword, // 이 부분이 핵심!
                lastLoginIp: null,
                lastLoginAt: null,
            };
            await db.collection("users").doc(userCredential.user.uid).set(userData);

            alert("회원가입 신청이 완료되었습니다. 관리자 승인 후 로그인이 가능합니다.");
            closeModal("registerModal");
        } catch (error) {
            console.error("회원가입 오류:", error);
            alert("회원가입 중 오류가 발생했습니다: " + error.message);
        } finally {
            hideLoading();
        }
    });
}

function updateAuthUI(user) {
    const authButtons = document.querySelector(".auth-buttons");

    if (user) {
        if (user.isAdmin) {
            authButtons.innerHTML = `
                    <button class="auth-btn" id="adminBtn">관리자 페이지</button>
                    <button class="auth-btn" id="logoutBtn">로그아웃</button>
                `;

            document.getElementById("adminBtn")?.addEventListener("click", function () {
                showAdminPage();
                loadPendingApprovals(); // 승인 대기 목록 로드 추가
            });
        } else {
            authButtons.innerHTML = `
                    <div class="user-info">
                        <span>${user.userId || user.name || "사용자"}님</span>
                        <div class="user-balance">
                            보유금액: <span>${user.balance ? user.balance.toLocaleString() : 0}원</span> | 
                            포인트: <span>${user.point ? user.point.toLocaleString() : 0}P</span>
                        </div>
                    </div>
                    <button class="auth-btn" id="logoutBtn">로그아웃</button>
                `;
        }

        document.getElementById("logoutBtn").addEventListener("click", async () => {
            try {
                await auth.signOut();
                isLoggedIn = false;
                updateAuthUI(null);
                showMainPage();
                alert("로그아웃 되었습니다.");
            } catch (error) {
                console.error("로그아웃 오류:", error);
                alert("로그아웃 중 오류가 발생했습니다.");
            }
        });
    } else {
        authButtons.innerHTML = `
                <button class="auth-btn" id="loginBtn">로그인</button>
                <button class="auth-btn" id="registerBtn">회원가입</button>
            `;

        document.getElementById("loginBtn").addEventListener("click", () => openModal("loginModal"));
        document.getElementById("registerBtn").addEventListener("click", () => openModal("registerModal"));
    }
}

/* 채팅 관련 함수들 */
function initCustomerChat() {
    const user = auth.currentUser;
    if (!user) {
        document.getElementById("chatMessages").innerHTML = '<div class="no-chat">로그인이 필요합니다</div>';
        return;
    }

    showLoading();

    // 기존 채팅이 있는지 확인
    db.collection("chats")
        .where("userId", "==", user.uid)
        .limit(1)
        .get()
        .then((querySnapshot) => {
            if (!querySnapshot.empty) {
                // 기존 채팅이 있으면 해당 채팅 ID 사용
                const chatDoc = querySnapshot.docs[0];
                currentChatId = chatDoc.id;
                loadChatMessages(currentChatId);
            } else {
                // 새 채팅 생성
                createNewChat(user);
            }
        })
        .catch((error) => {
            console.error("채팅 초기화 오류:", error);
            document.getElementById("chatMessages").innerHTML = '<div class="no-chat">채팅 초기화 중 오류 발생</div>';
        })
        .finally(() => hideLoading());
}

function createNewChat(user) {
    db.collection("chats")
        .add({
            userId: user.uid,
            userName: user.name || user.userId || "사용자",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: "active",
            unreadAdmin: 0,
            unreadUser: 0,
        })
        .then((docRef) => {
            currentChatId = docRef.id;
            loadChatMessages(currentChatId);
        })
        .catch((error) => {
            console.error("새 채팅 생성 오류:", error);
            document.getElementById("chatMessages").innerHTML = '<div class="no-chat">채팅 생성 중 오류 발생</div>';
        });
}

function loadChatMessages(chatId) {
    const chatMessages = document.getElementById("chatMessages");
    chatMessages.innerHTML = '<div class="no-chat">메시지 불러오는 중...</div>';

    // 기존 구독 해제
    if (chatUnsubscribe) {
        chatUnsubscribe();
    }

    // 메시지 구독 시작
    chatUnsubscribe = db
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .orderBy("timestamp", "asc")
        .onSnapshot(
            (querySnapshot) => {
                if (querySnapshot.empty) {
                    chatMessages.innerHTML = '<div class="no-chat">아직 메시지가 없습니다. 첫 메시지를 보내주세요.</div>';
                    return;
                }

                chatMessages.innerHTML = "";
                querySnapshot.forEach((doc) => {
                    const message = doc.data();
                    addMessageToChat(message, chatMessages);
                });

                // 스크롤을 최하단으로 이동
                chatMessages.scrollTop = chatMessages.scrollHeight;
            },
            (error) => {
                console.error("채팅 메시지 구독 오류:", error);
                chatMessages.innerHTML = '<div class="no-chat">메시지 불러오기 실패</div>';
            }
        );

    // 메시지 전송 버튼 설정
    document.getElementById("sendMessageBtn").addEventListener("click", sendMessage);
    document.getElementById("chatInput").addEventListener("keypress", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 읽음 표시 업데이트 (사용자가 메시지를 읽음)
    if (currentChatId) {
        db.collection("chats").doc(currentChatId).update({
            unreadUser: 0,
            updatedAt: new Date().toISOString(),
        });
    }
}

function addMessageToChat(message, container) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-message ${message.sender === "admin" ? "message-admin" : "message-user"}`;
    const time = new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    messageDiv.innerHTML = `
        <div>${esc(message.text)}</div>
        <div class="message-time">${time}</div>
    `;
    container.appendChild(messageDiv);
}

function sendMessage() {
    const input = document.getElementById("chatInput");
    const messageText = input.value.trim();

    if (!messageText || !currentChatId) return;

    const user = auth.currentUser;
    if (!user) return;

    showLoading();

    const newMessage = {
        text: messageText,
        sender: "user",
        timestamp: new Date().toISOString(),
        read: false,
    };

    // 메시지 저장
    db.collection("chats")
        .doc(currentChatId)
        .collection("messages")
        .add(newMessage)
        .then(() => {
            // 채팅 업데이트 (마지막 메시지 시간, 안읽은 메시지 수)
            db.collection("chats")
                .doc(currentChatId)
                .update({
                    updatedAt: new Date().toISOString(),
                    unreadAdmin: firebase.firestore.FieldValue.increment(1),
                    lastMessage: messageText.substring(0, 50),
                });

            input.value = "";
        })
        .catch((error) => {
            console.error("메시지 전송 오류:", error);
            alert("메시지 전송에 실패했습니다.");
        })
        .finally(() => hideLoading());
}

/* 관리자 채팅 기능 */
function loadAdminChatList() {
    const chatList = document.getElementById("adminChatList");
    chatList.innerHTML = '<div class="no-chat">채팅 목록 불러오는 중...</div>';

    // 기존 구독 해제
    if (adminChatUnsubscribe) {
        adminChatUnsubscribe();
    }

    // 채팅 목록 구독 시작
    adminChatUnsubscribe = db
        .collection("chats")
        .orderBy("updatedAt", "desc")
        .onSnapshot(
            (querySnapshot) => {
                if (querySnapshot.empty) {
                    chatList.innerHTML = '<div class="no-chat">활성화된 채팅이 없습니다</div>';
                    return;
                }

                chatList.innerHTML = "";
                querySnapshot.forEach((doc) => {
                    const chat = doc.data();
                    chat.id = doc.id;
                    addChatToList(chat, chatList);
                });
            },
            (error) => {
                console.error("채팅 목록 구독 오류:", error);
                chatList.innerHTML = '<div class="no-chat">채팅 목록 불러오기 실패</div>';
            }
        );
}

function addChatToList(chat, container) {
    const chatItem = document.createElement("div");
    chatItem.className = `admin-chat-item ${currentAdminChatId === chat.id ? "active" : ""}`;
    chatItem.dataset.chatId = chat.id;

    const lastMessageTime = new Date(chat.updatedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    chatItem.innerHTML = `
                    <div class="chat-user-info">
                        <span class="chat-user-name">${chat.userName}</span>
                        <span>${lastMessageTime}</span>
                    </div>
                    <div class="chat-last-message">
                        ${chat.lastMessage || "새 채팅"}
                        ${chat.unreadAdmin > 0 ? `<span class="chat-unread">${chat.unreadAdmin}</span>` : ""}
                    </div>
                `;

    chatItem.addEventListener("click", () => {
        openAdminChat(chat.id, chat.userName);
    });

    container.appendChild(chatItem);
}

/**
 * 관리자-사용자 채팅창 열기 (컨테이너가 이미 있어도 내부 구조가 없으면 주입)
 */
function openAdminChat(chatId, userName) {
    currentAdminChatId = chatId;

    /* 1) 좌측 채팅 목록 하이라이트 */
    document.querySelectorAll(".admin-chat-item").forEach((item) => {
        item.classList.toggle("active", item.dataset.chatId === chatId);
    });

    /* 2) 채팅 컨테이너 준비 */
    let chatContainer = document.getElementById("adminChatContainer");
    const chatSection = document.querySelector("#chatsTab .admin-section");

    // 섹션이 없으면 중단
    if (!chatSection) {
        console.error("Chat section not found");
        return;
    }

    // 컨테이너가 없으면 새로 생성해서 섹션에 추가
    if (!chatContainer) {
        chatContainer = document.createElement("div");
        chatContainer.id = "adminChatContainer";
        chatContainer.className = "admin-chat-container";
        chatSection.appendChild(chatContainer);
    }

    /* 3) 내부 구조(헤더·메시지·입력창)가 없으면 주입 */
    if (!chatContainer.querySelector("#adminChatMessages")) {
        chatContainer.innerHTML = `
            <div class="admin-chat-header">
                <div class="admin-chat-user">${userName}님과의 채팅</div>
                <button class="admin-close-chat" id="adminCloseChat">닫기</button>
            </div>
            <div class="chat-container">
                <div class="chat-messages" id="adminChatMessages"></div>
                <div class="chat-input-area">
                    <textarea id="adminChatInput"
                              class="form-control"
                              rows="3"
                              placeholder="메시지를 입력하세요…"></textarea>
                    <button id="adminSendMessageBtn" class="btn" style="margin-top:10px;">전송</button>
                </div>
            </div>
        `;

        /* 3-1) 이벤트 리스너 */
        chatContainer.querySelector("#adminCloseChat").addEventListener("click", () => {
            chatContainer.style.display = "none";
            currentAdminChatId = null;
        });

        const sendBtn = chatContainer.querySelector("#adminSendMessageBtn");
        const inputBox = chatContainer.querySelector("#adminChatInput");

        sendBtn.addEventListener("click", sendAdminMessage);
        inputBox.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendAdminMessage();
            }
        });
    }

    /* 4) 표시 및 메시지 로드 */
    chatContainer.style.display = "block";

    // setTimeout으로 한 틱 뒤에 호출하면 DOM이 완전히 그려진 뒤 실행돼 안전
    setTimeout(() => loadAdminChatMessages(chatId), 0);

    /* 5) 읽음 처리 */
    db.collection("chats").doc(chatId).update({
        unreadAdmin: 0,
        updatedAt: new Date().toISOString(),
    });
}

function loadAdminChatMessages(chatId) {
    // 요소가 존재하는지 다시 확인
    const chatMessages = document.getElementById("adminChatMessages");

    if (!chatMessages) {
        console.error("adminChatMessages element still not found");
        return;
    }

    chatMessages.innerHTML = '<div class="no-chat">메시지 불러오는 중...</div>';

    // 메시지 구독 시작
    db.collection("chats")
        .doc(chatId)
        .collection("messages")
        .orderBy("timestamp", "asc")
        .onSnapshot(
            (querySnapshot) => {
                if (querySnapshot.empty) {
                    chatMessages.innerHTML = '<div class="no-chat">아직 메시지가 없습니다</div>';
                    return;
                }

                chatMessages.innerHTML = "";
                querySnapshot.forEach((doc) => {
                    const message = doc.data();
                    addMessageToAdminChat(message, chatMessages);
                });

                // 스크롤을 최하단으로 이동
                chatMessages.scrollTop = chatMessages.scrollHeight;
            },
            (error) => {
                console.error("관리자 채팅 메시지 구독 오류:", error);
                chatMessages.innerHTML = '<div class="no-chat">메시지 불러오기 실패</div>';
            }
        );
}

function fitPopupToViewport() {
    const popup = document.getElementById("tetherPopup");
    if (!popup) return;

    // 실제 보이는 뷰포트 크기
    const vw = Math.min(window.innerWidth, document.documentElement.clientWidth);
    const vh = Math.min(window.innerHeight, document.documentElement.clientHeight);

    // 팝업 위치 및 크기 설정
    popup.style.position = "fixed";
    popup.style.top = "0";
    popup.style.left = "0";
    popup.style.width = vw + "px";
    popup.style.height = vh + "px";
    popup.style.margin = "0";
    popup.style.padding = "0";
    popup.style.boxSizing = "border-box";

    // 내부 컨텐츠가 넘칠 때 스크롤 처리
    const content = popup.querySelector(".tether-popup__content");
    if (content) {
        content.style.maxHeight = vh + "px";
        content.style.overflowY = "auto";
        content.style.boxSizing = "border-box";
        content.style.paddingBottom = "60px"; // 하단 체크박스 공간 확보
    }
}

function closePopup() {
    const popup = document.getElementById("tetherPopup");
    if (popup) {
        popup.style.display = "none";
    }
}

function addMessageToAdminChat(message, container) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-message ${message.sender === "admin" ? "message-admin" : "message-user"}`;

    const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    messageDiv.innerHTML = `
                    <div>${message.text}</div>
                    <div class="message-time">${time}</div>
                `;

    container.appendChild(messageDiv);
}
/* function setupCopyButton() {
    const copyBtn = document.getElementById("verifyAccountBtn");
    copyBtn.addEventListener("click", () => {
        if (!currentDepositAccount) return alert("계좌 정보를 불러오는 중입니다");
        navigator.clipboard.writeText(currentDepositAccount).then(() => {
            const o = copyBtn.textContent;
            copyBtn.textContent = "복사됨!";
            copyBtn.style.backgroundColor = "var(--accent-green)";
            setTimeout(() => {
                copyBtn.textContent = o;
                copyBtn.style.backgroundColor = "var(--neon-blue)";
            }, 2000);
        });
    });
} */

function showBlockedPopup(message) {
    // 기존에 열린 차단 팝업이 있으면 제거
    const existingPopup = document.getElementById("blockedPopup");
    if (existingPopup) {
        document.body.removeChild(existingPopup);
    }

    // 새 팝업 생성
    const popup = document.createElement("div");
    popup.id = "blockedPopup";
    popup.style.position = "fixed";
    popup.style.top = "0";
    popup.style.left = "0";
    popup.style.width = "100%";
    popup.style.height = "100%";
    popup.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    popup.style.display = "flex";
    popup.style.justifyContent = "center";
    popup.style.alignItems = "center";
    popup.style.zIndex = "9999";
    popup.style.animation = "fadeIn 0.3s ease";

    popup.innerHTML = `
        <div style="background: #1a1a2e; padding: 30px; border-radius: 10px; 
                    border: 2px solid var(--accent-red); max-width: 80%; 
                    text-align: center; box-shadow: 0 0 20px rgba(255, 0, 0, 0.5);">
            <h3 style="color: var(--accent-red); margin-bottom: 20px;">
                <i class="fas fa-ban"></i> 접근 차단
            </h3>
            <p style="margin-bottom: 25px; font-size: 16px;">${message}</p>
            <button id="closeBlockedPopup" style="background: var(--accent-red); 
                    color: white; border: none; padding: 10px 25px; 
                    border-radius: 5px; cursor: pointer; font-weight: 600;">
                확인
            </button>
        </div>
    `;

    document.body.appendChild(popup);

    // 확인 버튼 이벤트 리스너
    document.getElementById("closeBlockedPopup").addEventListener("click", () => {
        popup.style.animation = "fadeIn 0.3s ease reverse";
        setTimeout(() => {
            document.body.removeChild(popup);
        }, 300);
    });
}

function sendAdminMessage() {
    const input = document.getElementById("adminChatInput");
    const messageText = input.value.trim();

    if (!messageText || !currentAdminChatId) return;

    showLoading();

    const newMessage = {
        text: messageText,
        sender: "admin",
        timestamp: new Date().toISOString(),
        read: false,
    };

    // 메시지 저장
    db.collection("chats")
        .doc(currentAdminChatId)
        .collection("messages")
        .add(newMessage)
        .then(() => {
            // 채팅 업데이트 (마지막 메시지 시간, 안읽은 메시지 수)
            db.collection("chats")
                .doc(currentAdminChatId)
                .update({
                    updatedAt: new Date().toISOString(),
                    unreadUser: firebase.firestore.FieldValue.increment(1),
                    lastMessage: messageText.substring(0, 50),
                });

            input.value = "";
        })
        .catch((error) => {
            console.error("관리자 메시지 전송 오류:", error);
            alert("메시지 전송에 실패했습니다.");
        })
        .finally(() => hideLoading());
}

/* DOMContentLoaded */
document.addEventListener("DOMContentLoaded", function () {
    initAurora();
    createParticles();
    setupAmountButtons();
    setupTabs();
    setupNavItems();
    loadDepositAccount();
    setupCopyButton();
    setupChargeTabs();
    setupChargeSubmit();
    setupAccountVerification();
    setupExchangeTabs();
    setupExchangeSubmit();
    setupBannerSlider();
    setupAdminTabs();
    setupLogin();
    setupRegister();
    document.getElementById("adminBackBtn").addEventListener("click", showMainPage);

    document.getElementById("adminBtn")?.addEventListener("click", function () {
        showAdminPage();
    });

    document.getElementById("userSearch").addEventListener(
        "input",
        debounce(function () {
            loadUserData();
        }, 300)
    );

    document.getElementById("exchangeBtn").addEventListener("click", function () {
        updateUserBalanceDisplay();
    });

    document.getElementById("userSearch").addEventListener("input", function () {
        loadUserData();
    });

    document.getElementById("saveDepositAccountBtn").addEventListener("click", () => {
        const bank = depBank.value.trim();
        const num = depNumber.value.trim();
        const holder = depHolder.value.trim();
        if (!bank || !num || !holder) return alert("세 항목 모두 입력하세요");

        showLoading();
        db.collection("config")
            .doc("depositAccount")
            .set({
                bank,
                accountNumber: num,
                holder,
                updatedAt: new Date().toISOString(),
            })
            .then(() => alert("입금 계좌가 저장되었습니다"))
            .catch((e) => alert("저장 실패: " + e.message))
            .finally(hideLoading);
    });

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                // 1) Firestore에서 사용자 문서 읽기
                const userDoc = await db.collection("users").doc(user.uid).get();
                if (!userDoc.exists) {
                    await auth.signOut();
                    showBlockedPopup("사용자 정보가 없습니다.");
                    return;
                }
                const userData = userDoc.data();

                // 2) 차단된 IP 목록 확인
                const ipAddress = userData.ipAddress || "알 수 없음";
                if (ipAddress !== "알 수 없음") {
                    const ipDoc = await db.collection("blockedIps").doc(ipAddress).get();
                    if (ipDoc.exists) {
                        await auth.signOut();
                        showBlockedPopup("차단된 IP 주소입니다. 관리자에게 문의하세요.");
                        return;
                    }
                }

                // 3) VPN/프록시 감지 (원할 때만)
                const vpnDetected = await isLikelyVpn(ipAddress);
                if (vpnDetected) {
                    await auth.signOut();
                    showBlockedPopup("VPN/프록시 사용이 감지되어 접근이 차단되었습니다.");
                    return;
                }

                // ...이후 정상 로그인 UI 처리
                updateAuthUI(userData);
            } catch (error) {
                await auth.signOut();
                showBlockedPopup("로그인 처리 중 오류가 발생했습니다.");
            }
        } else {
            // 로그아웃 상태 UI
            updateAuthUI(null);
        }
    });

    document.getElementById("loginBtn").addEventListener("click", () => openModal("loginModal"));
    document.getElementById("registerBtn").addEventListener("click", () => openModal("registerModal"));

    document.querySelectorAll(".close-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
            const modal = this.closest(".modal");
            closeModal(modal.id);
        });
    });

    document.getElementById("adminSendMessageBtn").addEventListener("click", sendAdminMessage);

    document.getElementById("adminCloseChat").addEventListener("click", () => {
        document.getElementById("adminChatContainer").style.display = "none";
        currentAdminChatId = null;
    });

    document.getElementById("adminChatInput").addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendAdminMessage();
        }
    });

    document.querySelectorAll(".modal").forEach((modal) => {
        modal.addEventListener("click", function (e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
});

// 전역 함수로 만들기
window.showUnderMaintenance = showUnderMaintenance;
window.updateUserBalance = updateUserBalance;
window.addEventListener("DOMContentLoaded", fitPopupToViewport);
window.addEventListener("resize", fitPopupToViewport);
