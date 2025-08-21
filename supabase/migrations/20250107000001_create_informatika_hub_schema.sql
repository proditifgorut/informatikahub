/*
# Informatika Hub E-Learning Platform Database Schema
This migration creates the complete database structure for the Informatika Learning Hub platform including user management, courses, templates, orders, and progress tracking.

## Query Description: 
This operation will create the initial database schema for the e-learning platform. This includes user authentication tables, course management, template marketplace, order processing, and student progress tracking. The migration is safe to run on a fresh database and includes proper RLS policies for security.

## Metadata:
- Schema-Category: "Safe"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- users: Extended user profiles beyond auth.users
- courses: Course catalog with video content
- course_videos: Individual videos within courses  
- templates: Website template marketplace
- orders: Purchase tracking for templates and services
- user_progress: Student learning progress tracking
- categories: Template categories

## Security Implications:
- RLS Status: Enabled
- Policy Changes: Yes
- Auth Requirements: Integrated with Supabase Auth

## Performance Impact:
- Indexes: Added for foreign keys and common queries
- Triggers: None initially
- Estimated Impact: Minimal, standard table creation
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'completed', 'cancelled');
CREATE TYPE order_type AS ENUM ('template', 'service', 'course');
CREATE TYPE service_type AS ENUM ('landing_page', 'business_website', 'ecommerce');

-- Users table (extends auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE public.categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses table
CREATE TABLE public.courses (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
    sks INTEGER NOT NULL CHECK (sks >= 1 AND sks <= 6),
    image_url TEXT NOT NULL,
    instructor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course videos table
CREATE TABLE public.course_videos (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    youtube_url TEXT NOT NULL,
    embed_url TEXT NOT NULL,
    duration TEXT,
    channel_name TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Templates table
CREATE TABLE public.templates (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category_id INTEGER REFERENCES public.categories(id) ON DELETE SET NULL,
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    image_url TEXT NOT NULL,
    demo_url TEXT,
    download_url TEXT,
    features JSONB DEFAULT '[]',
    rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    total_sales INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE public.orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    order_type order_type NOT NULL,
    template_id INTEGER REFERENCES public.templates(id) ON DELETE SET NULL,
    service_type service_type,
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
    status order_status DEFAULT 'pending',
    payment_method TEXT,
    payment_reference TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress table
CREATE TABLE public.user_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    course_id INTEGER REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    video_id INTEGER REFERENCES public.course_videos(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE,
    watch_time INTEGER DEFAULT 0, -- in seconds
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id, video_id)
);

-- Reviews table
CREATE TABLE public.reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    template_id INTEGER REFERENCES public.templates(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES public.courses(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK ((template_id IS NOT NULL AND course_id IS NULL) OR (template_id IS NULL AND course_id IS NOT NULL))
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_courses_semester ON public.courses(semester);
CREATE INDEX idx_course_videos_course_id ON public.course_videos(course_id);
CREATE INDEX idx_course_videos_order ON public.course_videos(course_id, order_index);
CREATE INDEX idx_templates_category ON public.templates(category_id);
CREATE INDEX idx_templates_price ON public.templates(price);
CREATE INDEX idx_templates_rating ON public.templates(rating DESC);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_user_progress_user_course ON public.user_progress(user_id, course_id);
CREATE INDEX idx_reviews_template ON public.reviews(template_id);
CREATE INDEX idx_reviews_course ON public.reviews(course_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only" ON public.users
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Categories policies (public read)
CREATE POLICY "Categories are publicly readable" ON public.categories
    FOR SELECT USING (true);

-- Courses policies (public read)
CREATE POLICY "Courses are publicly readable" ON public.courses
    FOR SELECT USING (is_active = true);

-- Course videos policies (public read for active courses)
CREATE POLICY "Course videos are publicly readable" ON public.course_videos
    FOR SELECT USING (
        is_active = true AND 
        EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND is_active = true)
    );

-- Templates policies (public read)
CREATE POLICY "Templates are publicly readable" ON public.templates
    FOR SELECT USING (is_active = true);

-- Orders policies (users can only see their own orders)
CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending orders" ON public.orders
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- User progress policies (users can only see their own progress)
CREATE POLICY "Users can view their own progress" ON public.user_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress" ON public.user_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON public.user_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- Reviews policies
CREATE POLICY "Reviews are publicly readable" ON public.reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON public.reviews
    FOR UPDATE USING (auth.uid() = user_id);

-- Insert initial data

-- Categories
INSERT INTO public.categories (name, description, icon) VALUES
('Landing Page', 'Single page websites for businesses', '🏠'),
('E-Commerce', 'Online store templates', '🛒'),
('Portfolio', 'Personal and professional portfolios', '💼'),
('Blog', 'Blog and content websites', '📝'),
('Corporate', 'Business and corporate websites', '🏢'),
('Restaurant', 'Food and restaurant websites', '🍽️'),
('Real Estate', 'Property and real estate sites', '🏡'),
('Education', 'Educational institution websites', '🎓'),
('Healthcare', 'Medical and healthcare sites', '⚕️'),
('Travel', 'Travel and tourism websites', '✈️'),
('Fashion', 'Fashion and beauty websites', '👗'),
('Technology', 'Tech and software company sites', '💻'),
('Finance', 'Financial services websites', '💰'),
('Construction', 'Construction and engineering sites', '🔨'),
('Beauty', 'Beauty and wellness websites', '💄');

-- Sample courses (based on your existing course structure)
INSERT INTO public.courses (title, description, semester, sks, image_url) VALUES
('Algoritma dan Pemrograman', 'Mempelajari dasar-dasar algoritma dan konsep pemrograman menggunakan berbagai bahasa pemrograman.', 1, 3, 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=300&h=200&fit=crop'),
('Basis Data', 'Mempelajari konsep database, desain database, SQL, dan sistem manajemen basis data.', 3, 3, 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&h=200&fit=crop'),
('Pemrograman Web', 'Mempelajari teknologi web modern termasuk HTML, CSS, JavaScript, dan framework web.', 4, 3, 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=300&h=200&fit=crop'),
('Jaringan Komputer', 'Mempelajari konsep dasar jaringan, protokol, keamanan jaringan, dan administrasi sistem.', 5, 3, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop'),
('Rekayasa Perangkat Lunak', 'Mempelajari metodologi pengembangan software, SDLC, testing, dan project management.', 5, 3, 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=300&h=200&fit=crop'),
('Kecerdasan Buatan', 'Mempelajari konsep AI, machine learning, deep learning, dan implementasi praktis.', 6, 3, 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=300&h=200&fit=crop'),
('Keamanan Siber', 'Mempelajari konsep cybersecurity, ethical hacking, penetration testing, dan digital forensics.', 7, 3, 'https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=300&h=200&fit=crop'),
('Mobile App Development', 'Mempelajari pengembangan aplikasi mobile untuk Android dan iOS menggunakan teknologi modern.', 6, 3, 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=300&h=200&fit=crop');

-- Course videos (sample data for first course)
INSERT INTO public.course_videos (course_id, title, youtube_url, embed_url, duration, channel_name, order_index) VALUES
(1, 'Introduction to Programming', 'https://www.youtube.com/watch?v=zOjov-2OZ0E', 'https://www.youtube.com/embed/zOjov-2OZ0E', '45:30', 'Edureka', 1),
(1, 'Data Structures and Algorithms', 'https://www.youtube.com/watch?v=RBSGKlAvoiM', 'https://www.youtube.com/embed/RBSGKlAvoiM', '13:44:44', 'FreeCodeCamp', 2),
(1, 'Python Programming Tutorial', 'https://www.youtube.com/watch?v=rfscVS0vtbw', 'https://www.youtube.com/embed/rfscVS0vtbw', '4:26:52', 'FreeCodeCamp', 3);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON public.user_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
