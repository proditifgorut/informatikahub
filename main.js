import { dbService } from './supabase.js';

// Enhanced InformatikaHub class with Supabase integration
class InformatikaHub {
    constructor() {
        this.dbService = dbService;
        this.currentUser = null;
        this.currentTemplatesPage = 1;
        this.templatesPerPage = 12;
        this.courses = [];
        this.templates = [];
        this.init();
    }

    async init() {
        await this.loadInitialData();
        this.setupEventListeners();
        this.loadCourses();
        this.loadTemplates();
        this.updateAuthUI();
        this.setupAuthStateListener();
    }

    async loadInitialData() {
        try {
            // Check if user is already logged in
            this.currentUser = await this.dbService.getCurrentUser();
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    setupAuthStateListener() {
        this.dbService.supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN') {
                this.currentUser = await this.dbService.getCurrentUser();
                this.updateAuthUI();
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.updateAuthUI();
            }
        });
    }

    setupEventListeners() {
        // Mobile menu
        document.getElementById('mobileMenuBtn').addEventListener('click', () => {
            const mobileMenu = document.getElementById('mobileMenu');
            mobileMenu.classList.toggle('hidden');
        });

        // Login modal
        document.getElementById('loginBtn').addEventListener('click', () => {
            if (this.currentUser) {
                this.handleLogout();
            } else {
                document.getElementById('loginModal').classList.remove('hidden');
            }
        });

        document.getElementById('mobileLoginBtn').addEventListener('click', () => {
            if (this.currentUser) {
                this.handleLogout();
            } else {
                document.getElementById('loginModal').classList.remove('hidden');
                document.getElementById('mobileMenu').classList.add('hidden');
            }
        });

        document.getElementById('closeLoginModal').addEventListener('click', () => {
            document.getElementById('loginModal').classList.add('hidden');
        });

        // Course modal
        document.getElementById('closeCourseModal').addEventListener('click', () => {
            document.getElementById('courseModal').classList.add('hidden');
        });

        // Auth tabs
        document.getElementById('loginTab').addEventListener('click', () => {
            this.switchAuthTab('login');
        });

        document.getElementById('registerTab').addEventListener('click', () => {
            this.switchAuthTab('register');
        });

        // Auth form
        document.getElementById('authForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAuth();
        });

        // Load more templates
        document.getElementById('loadMoreTemplates').addEventListener('click', () => {
            this.loadMoreTemplates();
        });

        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    switchAuthTab(tab) {
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const authSubmit = document.getElementById('authSubmit');

        if (tab === 'login') {
            loginTab.classList.add('border-b-2', 'border-primary-500', 'text-primary-600', 'font-medium');
            loginTab.classList.remove('text-gray-500');
            registerTab.classList.remove('border-b-2', 'border-primary-500', 'text-primary-600', 'font-medium');
            registerTab.classList.add('text-gray-500');
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
            authSubmit.textContent = 'Masuk';
        } else {
            registerTab.classList.add('border-b-2', 'border-primary-500', 'text-primary-600', 'font-medium');
            registerTab.classList.remove('text-gray-500');
            loginTab.classList.remove('border-b-2', 'border-primary-500', 'text-primary-600', 'font-medium');
            loginTab.classList.add('text-gray-500');
            registerForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
            authSubmit.textContent = 'Daftar';
        }
    }

    async handleAuth() {
        const isLogin = !document.getElementById('loginForm').classList.contains('hidden');
        const submitBtn = document.getElementById('authSubmit');
        const originalText = submitBtn.textContent;

        try {
            submitBtn.textContent = 'Loading...';
            submitBtn.disabled = true;

            if (isLogin) {
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                
                await this.dbService.signIn(email, password);
                alert('Login berhasil!');
            } else {
                const name = document.getElementById('registerName').value;
                const email = document.getElementById('registerEmail').value;
                const password = document.getElementById('registerPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;

                if (password !== confirmPassword) {
                    alert('Password tidak cocok!');
                    return;
                }

                await this.dbService.signUp(email, password, { name });
                alert('Registrasi berhasil! Silakan cek email Anda untuk verifikasi.');
                this.switchAuthTab('login');
            }

            document.getElementById('loginModal').classList.add('hidden');
            document.getElementById('authForm').reset();
        } catch (error) {
            console.error('Auth error:', error);
            alert(error.message);
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleLogout() {
        if (confirm('Apakah Anda yakin ingin logout?')) {
            try {
                await this.dbService.signOut();
                alert('Logout berhasil!');
            } catch (error) {
                console.error('Logout error:', error);
                alert('Gagal logout. Silakan coba lagi.');
            }
        }
    }

    updateAuthUI() {
        const loginBtn = document.getElementById('loginBtn');
        const mobileLoginBtn = document.getElementById('mobileLoginBtn');

        if (this.currentUser && this.currentUser.profile) {
            const userName = this.currentUser.profile.full_name || this.currentUser.email;
            loginBtn.textContent = `Halo, ${userName}`;
            mobileLoginBtn.textContent = `Halo, ${userName}`;
        } else {
            loginBtn.textContent = 'Masuk';
            mobileLoginBtn.textContent = 'Masuk';
        }
    }

    async loadCourses() {
        try {
            this.courses = await this.dbService.getCourses();
            this.renderCourses();
        } catch (error) {
            console.error('Error loading courses:', error);
            // Fallback to static data if database fails
            this.courses = this.getStaticCourses();
            this.renderCourses();
        }
    }

    renderCourses() {
        const container = document.getElementById('coursesContainer');
        
        container.innerHTML = this.courses.map(course => `
            <div class="card p-6 cursor-pointer" onclick="app.showCourseDetail(${course.id})">
                <img src="${course.image_url || this.getDefaultCourseImage(course.id)}" alt="${course.title}" class="w-full h-48 object-cover rounded-lg mb-4">
                <div class="flex justify-between items-center mb-2">
                    <span class="bg-primary-100 text-primary-600 text-xs font-medium px-2 py-1 rounded">Semester ${course.semester}</span>
                    <span class="text-gray-500 text-sm">${course.credits} SKS</span>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-2">${course.title}</h3>
                <p class="text-gray-600 mb-4">${course.description}</p>
                <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-500">${course.course_videos ? course.course_videos.length : 0} Video Pembelajaran</span>
                    <a href="https://wa.me/6283119226089?text=Halo%2C%20saya%20ingin%20tahu%20lebih%20lanjut%20tentang%20mata%20kuliah%20${encodeURIComponent(course.title)}" 
                       target="_blank" 
                       class="btn-whatsapp text-sm"
                       onclick="event.stopPropagation()">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                        </svg>
                        Tanya
                    </a>
                </div>
            </div>
        `).join('');
    }

    async showCourseDetail(courseId) {
        try {
            const course = await this.dbService.getCourseById(courseId);
            if (!course) {
                alert('Course tidak ditemukan');
                return;
            }

            document.getElementById('courseModalTitle').textContent = course.title;
            document.getElementById('courseModalContent').innerHTML = `
                <div class="mb-6">
                    <img src="${course.image_url || this.getDefaultCourseImage(course.id)}" alt="${course.title}" class="w-full h-64 object-cover rounded-lg mb-4">
                    <div class="flex gap-4 mb-4">
                        <span class="bg-primary-100 text-primary-600 px-3 py-1 rounded-full text-sm font-medium">Semester ${course.semester}</span>
                        <span class="bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm font-medium">${course.credits} SKS</span>
                    </div>
                    <p class="text-gray-600 text-lg">${course.description}</p>
                </div>
                
                <div>
                    <h3 class="text-xl font-bold text-gray-900 mb-4">Video Pembelajaran (${course.course_videos ? course.course_videos.length : 0} Video)</h3>
                    <div class="space-y-6">
                        ${course.course_videos ? course.course_videos.map((video, index) => `
                            <div class="border border-gray-200 rounded-lg p-4">
                                <div class="flex justify-between items-center mb-3">
                                    <h4 class="font-semibold text-lg">${index + 1}. ${video.title}</h4>
                                    <div class="flex items-center gap-4">
                                        <span class="text-sm text-gray-500">${video.duration}</span>
                                        <span class="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-medium">${video.channel}</span>
                                    </div>
                                </div>
                                <div class="video-container mb-3">
                                    <iframe src="${video.youtube_url}" 
                                            frameborder="0" 
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                            allowfullscreen>
                                    </iframe>
                                </div>
                                <div class="flex justify-between items-center">
                                    <a href="${video.youtube_url.replace('/embed/', '/watch?v=')}" 
                                       target="_blank" 
                                       class="text-primary-600 hover:text-primary-700 text-sm font-medium">
                                        Tonton di YouTube →
                                    </a>
                                    <a href="https://wa.me/6283119226089?text=Halo%2C%20saya%20butuh%20bantuan%20dengan%20video%20${encodeURIComponent(video.title)}%20dari%20mata%20kuliah%20${encodeURIComponent(course.title)}" 
                                       target="_blank" 
                                       class="btn-whatsapp text-sm">
                                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                                        </svg>
                                        Tanya
                                    </a>
                                </div>
                            </div>
                        `).join('') : '<p class="text-gray-500 text-center py-8">Belum ada video pembelajaran tersedia.</p>'}
                    </div>
                </div>
            `;

            document.getElementById('courseModal').classList.remove('hidden');
        } catch (error) {
            console.error('Error showing course detail:', error);
            alert('Gagal memuat detail mata kuliah');
        }
    }

    async loadTemplates() {
        try {
            this.templates = await this.dbService.getTemplates(null, this.templatesPerPage);
            this.renderTemplates(this.templates);
        } catch (error) {
            console.error('Error loading templates:', error);
            // Fallback to static data if database fails
            this.templates = this.getStaticTemplates();
            this.renderTemplates(this.templates);
        }
    }

    async loadMoreTemplates() {
        try {
            this.currentTemplatesPage++;
            const offset = (this.currentTemplatesPage - 1) * this.templatesPerPage;
            const newTemplates = await this.dbService.getTemplates(null, this.templatesPerPage, offset);
            
            if (newTemplates.length > 0) {
                this.templates = [...this.templates, ...newTemplates];
                this.renderTemplates(newTemplates, true);
            } else {
                document.getElementById('loadMoreTemplates').style.display = 'none';
            }
        } catch (error) {
            console.error('Error loading more templates:', error);
        }
    }

    renderTemplates(templates, append = false) {
        const container = document.getElementById('marketplaceContainer');
        const templatesHTML = templates.map(template => `
            <div class="card p-4">
                <img src="${template.preview_url || this.getDefaultTemplateImage()}" alt="${template.title}" class="w-full h-40 object-cover rounded-lg mb-3">
                <div class="flex justify-between items-center mb-2">
                    <span class="bg-primary-100 text-primary-600 text-xs font-medium px-2 py-1 rounded">${template.categories ? template.categories.name : 'General'}</span>
                    <div class="flex items-center">
                        <span class="text-yellow-400 text-sm">★</span>
                        <span class="text-gray-500 text-xs ml-1">${template.rating || '4.8'}</span>
                    </div>
                </div>
                <h3 class="font-bold text-gray-900 mb-2 text-sm">${template.title}</h3>
                <p class="text-gray-600 text-xs mb-3 line-clamp-2">${template.description}</p>
                <div class="flex justify-between items-center mb-3">
                    <span class="text-primary-600 font-bold">Rp ${template.price.toLocaleString('id-ID')}</span>
                    <span class="text-gray-500 text-xs">${template.sales || 0} terjual</span>
                </div>
                <div class="flex gap-2">
                    <a href="${template.demo_url || '#'}" target="_blank" class="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded text-center text-sm hover:bg-gray-200 transition-colors">Demo</a>
                    <a href="https://wa.me/6283119226089?text=Halo%2C%20saya%20tertarik%20dengan%20template%20${encodeURIComponent(template.title)}%20seharga%20Rp%20${template.price.toLocaleString('id-ID')}" 
                       target="_blank" 
                       class="flex-1 btn-whatsapp text-sm justify-center py-2">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                        </svg>
                        Beli
                    </a>
                </div>
            </div>
        `).join('');

        if (append) {
            container.innerHTML += templatesHTML;
        } else {
            container.innerHTML = templatesHTML;
        }
    }

    // Utility methods for fallback data
    getDefaultCourseImage(courseId) {
        const images = [
            'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=300&h=200&fit=crop',
            'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&h=200&fit=crop',
            'https://images.unsplash.com/photo-1547658719-da2b51169166?w=300&h=200&fit=crop',
            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop'
        ];
        return images[(courseId - 1) % images.length];
    }

    getDefaultTemplateImage() {
        return 'https://images.unsplash.com/photo-1460925895917-adfb0aad7b2f?w=300&h=200&fit=crop';
    }

    getStaticCourses() {
        return [
            {
                id: 1,
                title: 'Algoritma dan Pemrograman',
                description: 'Mempelajari dasar-dasar algoritma dan konsep pemrograman menggunakan berbagai bahasa pemrograman.',
                semester: 1,
                credits: 3,
                course_videos: [
                    {
                        title: 'Introduction to Programming',
                        youtube_url: 'https://www.youtube.com/embed/zOjov-2OZ0E',
                        duration: '45:30',
                        channel: 'Edureka'
                    }
                ]
            }
        ];
    }

    getStaticTemplates() {
        return [
            {
                id: 1,
                title: 'Modern Landing Page',
                description: 'Template landing page modern dan responsif',
                price: 500000,
                rating: 4.8,
                sales: 150
            }
        ];
    }
}

// Initialize the application
const app = new InformatikaHub();

// Make app globally accessible for onclick handlers
window.app = app;
