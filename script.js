// 의학적 가이드 데이터 셋 (보건복지부 및 한국건강증진개발원 공식 가이드 연동)
// [수정] 모든 이미지와 오디오 경로에 image/ 및 audio/ 폴더 경로를 추가했습니다.
const medicalData = {
    path_body: {
        partName: "허리와 복근",
        title: "■ 복근 및 허리 신전근 강화 운동",
        layout: "side-by-side", 
        images: ["image/image_body_a.png", "image/image_body_b.png"], 
        audio: "audio/audio_body.mp3", 
        guide: "✅ 왼쪽: 복부 근육, 골반 저근육 강화\n✅ 오른쪽: 허리 근육 강화, 등을 구부정하게 걷는 경우\n\n• 운동 방법: 한 동작을 5회 연속 진행하며, 한 자세를 6초 이상 지속합니다."
    },
    path_hip: {
        partName: "골반 (중둔근)",
        title: "■ 골반 바깥쪽 중둔근 강화 운동",
        images: ["image/image_hip_1.png", "image/image_hip_2.png"],
        audio: "audio/audio_hip.mp3",  
        guide: "✅ 균형이 안 좋은 경우\n✅ 골반 바깥쪽 및 몸통 근육 강화\n\n• 운동 방법: 한 동작을 5회 연속 진행하며, 한 자세를 6초 이상 지속합니다."
    },
    path_thigh: {
        partName: "허벅지 뒤쪽",
        title: "■ 허벅지 뒤쪽 신장 운동",
        images: ["image/image_thigh_1.png", "image/image_thigh_2.png"], 
        audio: "audio/audio_thigh.mp3", 
        guide: "✅ 무릎 관절염으로 고생하는 경우\n✅ 무릎이 완전히 펴지지 않는 경우\n\n• 운동 방법: 한 동작을 3회 연속 진행하며, 한 자세를 6초 이상 지속합니다."
    },
    path_knee: {
        partName: "무릎 (신전근)",
        title: "■ 무릎 신전근 강화 운동",
        images: ["image/image_knee_1.png", "image/image_knee_2.png"], 
        audio: "audio/audio_knee.mp3", 
        guide: "✅ 무릎을 움직이기 어려운 경우\n✅ 짧은 거리도 걷기 힘든 경우\n\n• 운동 방법: 한 동작을 10회 연속 진행하며, 한 자세를 6초 이상 지속합니다."
    }
};

const partIds = ['path_body', 'path_hip', 'path_thigh', 'path_knee'];
const labelBox = document.getElementById('label-box');
const boardTitle = document.getElementById('board-title');
const boardGuide = document.getElementById('board-guide');
const animWindow = document.getElementById('animation-window');

// 더블 프레임 레이어 추적
const imgLayers = [document.getElementById('board-img-1'), document.getElementById('board-img-2')];

let currentIdx = -1;
let parts = [];
let crossfadeInterval = null; 
let activeLayerIdx = 0;       
let currentFrameIdx = 0;      

// 모달 제어 상태 플래그
let isModalActive = true; 

// 상시 오디오 인스턴스 전역 관리 변수
let globalTtsAudio = null;

// 오디오 재생 전용 컨트롤러 함수
function playTts(audioSrc) {
    if (globalTtsAudio) {
        globalTtsAudio.pause();
        globalTtsAudio.currentTime = 0;
    }
    
    globalTtsAudio = new Audio(audioSrc);
    globalTtsAudio.play().catch(err => {
        console.warn("오디오 재생이 브라우저 정책에 의해 차단되었거나 파일이 없습니다:", err);
    });
}

window.addEventListener('DOMContentLoaded', () => {
    // 진입 즉시 확인 버튼에 초점을 강제 주입하여 원클릭 패스 준비
    const confirmBtn = document.getElementById('modal-confirm-btn');
    if (confirmBtn) {
        confirmBtn.focus();
        confirmBtn.addEventListener('click', closeSafetyModal);
    }

    // 🔊 [수정] 모달 오디오 경로 변경 (audio/ 폴더 추가)
    playTts("audio/audio_modal.mp3");

    // 🗺️ [수정] 인체 실루엣 SVG 경로 변경 (image/ 폴더 추가)
    fetch('image/human_body_silhouette.svg')
        .then(response => {
            if (!response.ok) throw new Error('SVG 수신 실패');
            return response.text();
        })
        .then(svgText => {
            document.getElementById('left-model-pane').innerHTML = svgText;
            labelBox.textContent = "부위를 선택하세요...";
            
            partIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('body-part');
            });
            initHorizontalEngine();
        })
        .catch(err => {
            document.getElementById('left-model-pane').textContent = "에러: SVG 로드 실패 (Live Server 확인 요망)";
            console.error(err);
        });
});

function initHorizontalEngine() {
    parts = partIds.map(id => document.getElementById(id));

    parts.forEach((part, idx) => {
        if (!part) return;
        const data = medicalData[part.id];

        part.addEventListener('mouseenter', () => {
            if (isModalActive) return; 
            clearAllRemoteFocus();
            currentIdx = idx;
            part.classList.add('focused');
            updateDisplayPanel(data);
        });

        part.addEventListener('mouseleave', () => {
            part.classList.remove('focused');
        });

        part.addEventListener('click', () => {
            if (isModalActive) return; 
            clearAllRemoteFocus();
            currentIdx = idx;
            part.classList.add('focused');
            updateDisplayPanel(data);
        });
    });

    window.addEventListener('keydown', (e) => {
        if (isModalActive) {
            if (e.key === 'Enter') {
                e.preventDefault();
                closeSafetyModal(); 
            }
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault(); 
            }
            return; 
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            clearAllRemoteFocus();
            currentIdx = (currentIdx + 1) % parts.length;
            moveFocusAndSyncData(currentIdx);
        } 
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            clearAllRemoteFocus();
            currentIdx = (currentIdx - 1 + parts.length) % parts.length;
            moveFocusAndSyncData(currentIdx);
        } 
        else if (e.key === 'Enter') {
            e.preventDefault();
            if (currentIdx >= 0 && parts[currentIdx]) {
                moveFocusAndSyncData(currentIdx);
            }
        }
    });
}

// 모달 폐쇄 및 초기 화면 밸런스 유지 함수
function closeSafetyModal() {
    const modal = document.getElementById('safety-modal');
    if (!modal) return;
    
    modal.style.opacity = '0'; 
    
    setTimeout(() => {
        modal.style.display = 'none';
        isModalActive = false; 
        
        // 🔊 [수정] 대시보드 초기 오디오 경로 변경 (audio/ 폴더 추가)
        playTts("audio/audio_initial.mp3");
    }, 300);
}

function updateDisplayPanel(data) {
    labelBox.textContent = data.partName;
    boardTitle.textContent = data.title;
    boardGuide.textContent = data.guide;
    
    if (data.audio) {
        playTts(data.audio);
    }
    
    if (data.images && data.images.length > 0) {
        animWindow.style.display = "block";
        
        if (data.layout === "side-by-side") {
            animWindow.classList.add('side-by-side'); 
            stopCrossfadeSequence(); 
            
            imgLayers[0].src = data.images[0] || "";
            imgLayers[0].style.opacity = "1";
            imgLayers[1].src = data.images[1] || "";
            imgLayers[1].style.opacity = "1";
        } else {
            animWindow.classList.remove('side-by-side'); 
            startCrossfadeSequence(data.images); 
        }
    } else {
        animWindow.style.display = "none";
        animWindow.classList.remove('side-by-side');
        stopCrossfadeSequence();
    }
}

function startCrossfadeSequence(imageArray) {
    stopCrossfadeSequence(); 
    
    currentFrameIdx = 0;
    activeLayerIdx = 0;
    
    imgLayers[0].src = imageArray[0];
    imgLayers[0].style.opacity = "1";
    imgLayers[1].style.opacity = "0";
    
    if (imageArray.length <= 1) return;

    crossfadeInterval = setInterval(() => {
        const nextFrameIdx = (currentFrameIdx + 1) % imageArray.length;
        const nextLayerIdx = 1 - activeLayerIdx; 
        
        imgLayers[nextLayerIdx].src = imageArray[nextFrameIdx];
        
        imgLayers[activeLayerIdx].style.opacity = "0";
        imgLayers[nextLayerIdx].style.opacity = "1";
        
        currentFrameIdx = nextFrameIdx;
        activeLayerIdx = nextLayerIdx;

    }, 6000);
}

function stopCrossfadeSequence() {
    if (crossfadeInterval) {
        clearInterval(crossfadeInterval);
        crossfadeInterval = null;
    }
    imgLayers.forEach(layer => {
        layer.style.opacity = "0";
        layer.src = "";
    });
}

function moveFocusAndSyncData(idx) {
    if (!parts[idx]) return;
    parts[idx].classList.add('focused');
    parts[idx].focus();
    updateDisplayPanel(medicalData[parts[idx].id]);
}

function clearAllRemoteFocus() { 
    parts.forEach(p => p && p.classList.remove('focused')); 
}