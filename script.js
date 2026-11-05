
// ========================================
// 1. KONEKSI SUPABASE
// ========================================

const SUPABASE_URL = "https://xnzibnefyzztoeksgfdg.supabase.co";

// GANTI dengan Publishable key dari Supabase kamu
const SUPABASE_KEY = "sb_publishable_5LC8aBPMurWiVKpHUX2NHg_rzG6fklU";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let currentUser = null;

// ========================================
// 2. FUNGSI BANTUAN
// ========================================

const $ = (id) => document.getElementById(id);

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function showMessage(id, message, isError = false) {
  const element = $(id);
  if (!element) return;

  element.textContent = message;
  element.style.color = isError ? "#c0392b" : "#27845b";
}

function setLoading(form, loading) {
  const button = form.querySelector('button[type="submit"]');

  if (button) {
    button.disabled = loading;
    button.textContent = loading ? "Memproses..." : button.dataset.originalText;
  }
}

document.querySelectorAll('button[type="submit"]').forEach((button) => {
  button.dataset.originalText = button.textContent;
});

function formatDate(date) {
  return new Date(date + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

// ========================================
// 3. PINDAH TAB LOGIN DAN DAFTAR
// ========================================

$("show-login").addEventListener("click", () => {
  $("login-form").classList.remove("hidden");
  $("register-form").classList.add("hidden");

  $("show-login").classList.add("active");
  $("show-register").classList.remove("active");

  showMessage("auth-message", "");
});

$("show-register").addEventListener("click", () => {
  $("register-form").classList.remove("hidden");
  $("login-form").classList.add("hidden");

  $("show-register").classList.add("active");
  $("show-login").classList.remove("active");

  showMessage("auth-message", "");
});

// ========================================
// 4. DAFTAR AKUN
// ========================================

$("register-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  setLoading(form, true);

  const nama = $("register-name").value.trim();
  const email = $("register-email").value.trim();
  const password = $("register-password").value;

  try {
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: {
          nama: nama
        }
      }
    });

    if (error) throw error;

    if (data.session) {
      await saveNewProfile(data.user, nama);
      showMessage("auth-message", "Pendaftaran berhasil! Selamat datang.");
    } else {
      showMessage(
        "auth-message",
        "Pendaftaran berhasil. Periksa email kamu untuk konfirmasi akun sebelum masuk."
      );
    }

    form.reset();

  } catch (error) {
    showMessage("auth-message", error.message, true);
  } finally {
    setLoading(form, false);
  }
});

async function saveNewProfile(user, nama) {
  const { error } = await db.from("profiles").upsert({
    id: user.id,
    nama: nama
  });

  if (error) throw error;
}

// ========================================
// 5. LOGIN
// ========================================

$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  setLoading(form, true);

  const email = $("login-email").value.trim();
  const password = $("login-password").value;

  try {
    const { error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    showMessage("auth-message", "Login berhasil!");

  } catch (error) {
    showMessage("auth-message", error.message, true);
  } finally {
    setLoading(form, false);
  }
});

// ========================================
// 6. LOGOUT
// ========================================

$("logout-btn").addEventListener("click", async () => {
  const { error } = await db.auth.signOut();

  if (error) {
    alert(error.message);
  }
});

// ========================================
// 7. TAMPILAN LOGIN DAN DASHBOARD
// ========================================

function showApp(isLoggedIn) {
  $("auth-page").classList.toggle("hidden", isLoggedIn);
  $("app-page").classList.toggle("hidden", !isLoggedIn);
  $("main-nav").classList.toggle("hidden", !isLoggedIn);

  if (!isLoggedIn) {
    $("login-form").reset();
    $("register-form").reset();
  }
}

async function loadApplication(user) {
  currentUser = user;

  showApp(true);

  $("today-label").textContent = formatDate(today());

  await loadProfile();
  await loadMeals();
  await loadHabits();
  await loadEducation();
  await loadDashboard();
}

// Memeriksa status login ketika halaman dibuka
db.auth.onAuthStateChange((event, session) => {
  if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
    if (session?.user) {
      loadApplication(session.user);
    } else {
      currentUser = null;
      showApp(false);
    }
  }

  if (event === "SIGNED_OUT") {
    currentUser = null;
    showApp(false);
  }
});

// ========================================
// 8. NAVIGASI HALAMAN
// ========================================

const pages = [
  "dashboard",
  "nutrition",
  "habits",
  "education"
];

document.querySelectorAll("[data-page]").forEach((button) => {
  button.addEventListener("click", () => {
    const selectedPage = button.dataset.page;

    pages.forEach((page) => {
      $(`${page}-page`).classList.toggle(
        "hidden",
        page !== selectedPage
      );
    });
  });
});

// ========================================
// 9. MEMUAT PROFIL
// ========================================

async function loadProfile() {
  if (!currentUser) return;

  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    showMessage("profile-message", error.message, true);
    return;
  }

  if (!data) {
    $("profile-name").value =
      currentUser.user_metadata?.nama || "";

    $("user-name").textContent =
      currentUser.user_metadata?.nama || "Teman";

    return;
  }

  $("profile-name").value = data.nama || "";
  $("birth-date").value = data.tanggal_lahir || "";
  $("sex").value = data.jenis_kelamin || "";
  $("height").value = data.tinggi_cm || "";
  $("weight").value = data.berat_kg || "";
  $("activity-level").value = data.activity_level || "light";

  $("user-name").textContent = data.nama || "Teman";
}

// ========================================
// 10. MENYIMPAN PROFIL
// ========================================

$("profile-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) return;

  const form = event.currentTarget;
  setLoading(form, true);

  const nama = $("profile-name").value.trim();
  const tanggal_lahir = $("birth-date").value;
  const jenis_kelamin = $("sex").value;
  const tinggi_cm = Number($("height").value);
  const berat_kg = Number($("weight").value);
  const activity_level = $("activity-level").value;

  try {
    if (tanggal_lahir > today()) {
      throw new Error("Tanggal lahir tidak boleh di masa depan.");
    }

    const { error } = await db.from("profiles").upsert({
      id: currentUser.id,
      nama,
      tanggal_lahir,
      jenis_kelamin,
      tinggi_cm,
      berat_kg,
      activity_level
    });

    if (error) throw error;

    $("user-name").textContent = nama;

    showMessage("profile-message", "Profil berhasil disimpan!");

    await loadDashboard();

  } catch (error) {
    showMessage("profile-message", error.message, true);
  } finally {
    setLoading(form, false);
  }
});

// ========================================
// 11. MENAMBAHKAN MAKANAN
// ========================================

$("meal-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) return;

  const form = event.currentTarget;
  setLoading(form, true);

  const food_name = $("food-name").value.trim();
  const category = $("food-category").value;
  const serving_label = $("food-serving").value.trim();
  const quantity = Number($("food-quantity").value);

  try {
    if (!food_name || !serving_label || quantity <= 0) {
      throw new Error("Periksa kembali data makanan.");
    }

    const { error } = await db.from("meals").insert({
      user_id: currentUser.id,
      tanggal: today(),
      food_name,
      category,
      serving_label,
      quantity
    });

    if (error) throw error;

    showMessage("meal-message", "Makanan berhasil dicatat!");

    form.reset();
    $("food-quantity").value = 1;

    await loadMeals();
    await loadDashboard();

  } catch (error) {
    showMessage("meal-message", error.message, true);
  } finally {
    setLoading(form, false);
  }
});

// ========================================
// 12. MENAMPILKAN RIWAYAT MAKANAN
// ========================================

async function loadMeals() {
  if (!currentUser) return;

  const list = $("meal-list");
  list.innerHTML = "<p>Memuat catatan...</p>";

  const { data, error } = await db
    .from("meals")
    .select("*")
    .eq("user_id", currentUser.id)
    .eq("tanggal", today())
    .order("created_at", { ascending: false });

  if (error) {
    list.textContent = "Gagal memuat makanan: " + error.message;
    return;
  }

  if (!data.length) {
    list.innerHTML = '<div class="empty-state">Belum ada makanan dicatat hari ini.</div>';
    return;
  }

  list.innerHTML = "";

  data.forEach((meal) => {
    const card = document.createElement("div");
    card.className = "item-card";

    const info = document.createElement("div");

    const title = document.createElement("h4");
    title.textContent = meal.food_name;

    const detail = document.createElement("p");
    detail.textContent =
      `${meal.category} · ${meal.quantity} × ${meal.serving_label}`;

    info.append(title, detail);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-btn";
    deleteButton.textContent = "Hapus";

    deleteButton.addEventListener("click", () => {
      deleteMeal(meal.meal_id);
    });

    card.append(info, deleteButton);
    list.appendChild(card);
  });
}

// ========================================
// 13. MENGHAPUS MAKANAN
// ========================================

async function deleteMeal(id) {
  const confirmed = confirm("Hapus catatan makanan ini?");

  if (!confirmed) return;

  const { error } = await db
    .from("meals")
    .delete()
    .eq("meal_id", id)
    .eq("user_id", currentUser.id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadMeals();
  await loadDashboard();
}

// ========================================
// 14. MENYIMPAN KEBIASAAN
// ========================================

$("habit-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) return;

  const form = event.currentTarget;
  setLoading(form, true);

  const air = Number($("water").value);
  const sayur_buah = Number($("vegetables").value);
  const aktivitas_menit = Number($("activity-minutes").value);
  const makan_beragam = $("varied-meals").checked;

  try {
    const { error } = await db.from("habits").upsert({
      user_id: currentUser.id,
      tanggal: today(),
      air,
      sayur_buah,
      aktivitas_menit,
      makan_beragam
    }, {
      onConflict: "user_id,tanggal"
    });

    if (error) throw error;

    showMessage("habit-message", "Kebiasaan berhasil disimpan!");

    await loadDashboard();

  } catch (error) {
    showMessage("habit-message", error.message, true);
  } finally {
    setLoading(form, false);
  }
});

// ========================================
// 15. MEMUAT KEBIASAAN
// ========================================

async function loadHabits() {
  if (!currentUser) return;

  const { data, error } = await db
    .from("habits")
    .select("*")
    .eq("user_id", currentUser.id)
    .eq("tanggal", today())
    .maybeSingle();

  if (error || !data) return;

  $("water").value = data.air ?? 0;
  $("vegetables").value = data.sayur_buah ?? 0;
  $("activity-minutes").value = data.aktivitas_menit ?? 0;
  $("varied-meals").checked = data.makan_beragam ?? false;
}

// ========================================
// 16. MEMUAT EDUKASI
// ========================================

async function loadEducation() {
  const container = $("education-list");

  const { data, error } = await db
    .from("education")
    .select("*")
    .order("id");

  if (error) {
    container.textContent = "Gagal memuat edukasi: " + error.message;
    return;
  }

  if (!data.length) {
    container.innerHTML = `
      <article class="education-card">
        <h3>🥗 Makan beragam</h3>
        <p>
          Biasakan mengonsumsi berbagai jenis makanan agar tubuh
          mendapatkan beragam zat gizi.
        </p>
      </article>

      <article class="education-card">
        <h3>💧 Minum air putih</h3>
        <p>
          Minum air secara teratur sesuai kebutuhan tubuh dan aktivitas.
        </p>
      </article>

      <article class="education-card">
        <h3>🏃 Aktivitas fisik</h3>
        <p>
          Luangkan waktu untuk bergerak dan melakukan aktivitas
          fisik yang kamu sukai.
        </p>
      </article>

      <article class="education-card">
        <h3>😴 Istirahat cukup</h3>
        <p>
          Tidur yang cukup membantu menjaga kesehatan dan mendukung
          proses belajar.
        </p>
      </article>
    `;

    return;
  }

  container.innerHTML = "";

  data.forEach((item) => {
    const card = document.createElement("article");
    card.className = "education-card";

    const title = document.createElement("h3");
    title.textContent = item.judul;

    const content = document.createElement("p");
    content.textContent = item.isi;

    card.append(title, content);

    if (item.sumber) {
      const source = document.createElement("small");
      source.textContent = "Sumber: " + item.sumber;
      card.appendChild(source);
    }

    container.appendChild(card);
  });
}

// ========================================
// 17. MEMUAT DASHBOARD
// ========================================

async function loadDashboard() {
  if (!currentUser) return;

  const { data: meals, error: mealError } = await db
    .from("meals")
    .select("meal_id")
    .eq("user_id", currentUser.id)
    .eq("tanggal", today());

  if (!mealError) {
    $("stat-meals").textContent = meals.length;
  }

  const { data: habit, error: habitError } = await db
    .from("habits")
    .select("*")
    .eq("user_id", currentUser.id)
    .eq("tanggal", today())
    .maybeSingle();

  if (!habitError) {
    $("stat-water").textContent = `${habit?.air ?? 0} gelas`;
    $("stat-activity").textContent =
      `${habit?.aktivitas_menit ?? 0} menit`;
  }
}
