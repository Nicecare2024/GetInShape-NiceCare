// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyB-nxvyQIV6TRs60cmFjB7hplCwgY8SwEI",
  authDomain: "e-data-6ca63.firebaseapp.com",
  projectId: "e-data-6ca63",
  storageBucket: "e-data-6ca63.firebasestorage.app",
  messagingSenderId: "76571848548",
  appId: "1:76571848548:web:fa52ee1a390e7d49031471"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let allMembers = [];
let currentPage = 1;
const pageSize = 9;

// Add Member
document.getElementById("memberForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const member = {
    name: document.getElementById("name").value,
    joiningDate: document.getElementById("joiningDate").value,
    phone: document.getElementById("phone").value,
    bloodGroup: document.getElementById("bloodGroup").value,
    memberId: document.getElementById("memberId").value,
    memberAdd: document.getElementById("memberAdd") ? document.getElementById("memberAdd").value : ""
  };
  await db.collection("members").add(member);
  e.target.reset();
  loadMembers();
});

// Load and sort members by memberId
async function loadMembers() {
  const snapshot = await db.collection("members").get();
  allMembers = snapshot.docs
    .map(doc => ({ doc, data: doc.data() }))
    .sort((a, b) => a.data.memberId.localeCompare(b.data.memberId));

  currentPage = 1;
  renderPaginatedMembers();

  document.getElementById("memberCount").textContent = `Total Members: ${allMembers.length}`;
}



// Render paginated members
function renderPaginatedMembers() {
  const startIndex = (currentPage - 1) * pageSize;
  const pageItems = allMembers.slice(startIndex, startIndex + pageSize);

  renderMemberCards(pageItems, startIndex);

  document.getElementById("prevBtn").disabled = currentPage === 1;
  document.getElementById("nextBtn").disabled = startIndex + pageSize >= allMembers.length;
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderPaginatedMembers();
  }
}

function nextPage() {
  if ((currentPage - 1) * pageSize + pageSize < allMembers.length) {
    currentPage++;
    renderPaginatedMembers();
  }
}

// Render cards with serial number
function renderMemberCards(memberEntries, startIndex = 0) {
  const container = document.getElementById("memberCards");
  container.innerHTML = "";

  memberEntries.forEach((entry, index) => {
    const { doc, data } = entry;
    const serial = startIndex + index + 1;

    const card = document.createElement("div");
    card.className = "col-md-4";
    card.innerHTML = `
      <div class="card">
        <div class="card-body">
          <h5 class="text-primary mb-3">#${serial}</h5>
          <input class="form-control mb-2" value="${data.name}" data-id="${doc.id}" data-field="name">
          <input class="form-control mb-2" value="${data.joiningDate}" data-id="${doc.id}" data-field="joiningDate" type="date">
          <input class="form-control mb-2" value="${data.phone}" data-id="${doc.id}" data-field="phone">
          <input class="form-control mb-2" value="${data.bloodGroup}" data-id="${doc.id}" data-field="bloodGroup">
          <input class="form-control mb-2" value="${data.memberId}" data-id="${doc.id}" data-field="memberId">
          <input class="form-control mb-2" value="${data.memberAdd || ''}" data-id="${doc.id}" data-field="memberAdd">
          <div class="d-flex gap-2">
            <button class="btn btn-success w-50" onclick="updateMember('${doc.id}')">Save</button>
            <button class="btn btn-danger w-50" onclick="deleteMember('${doc.id}')">Delete</button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}



// Update member
async function updateMember(id) {
  const inputs = document.querySelectorAll(`[data-id="${id}"]`);
  const updatedData = {};
  inputs.forEach(input => {
    updatedData[input.dataset.field] = input.value;
  });
  await db.collection("members").doc(id).update(updatedData);
  alert("Member updated!");
  loadMembers();
}

// Delete member
async function deleteMember(id) {
  if (confirm("Are you sure you want to delete this member?")) {
    await db.collection("members").doc(id).delete();
    loadMembers();
  }
}

// Search by name (preserving sort order)
function searchMember() {
  const keyword = document.getElementById("searchName").value.trim().toLowerCase();
  if (!keyword) return;

  const filtered = allMembers.filter(entry =>
    entry.data.name.toLowerCase().includes(keyword)
  );

  renderMemberCards(filtered, 0);
  document.getElementById("prevBtn").disabled = true;
  document.getElementById("nextBtn").disabled = true;
}

window.onload = loadMembers;