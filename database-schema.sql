-- Database Schema for Informatika Hub E-Learning Platform
-- This is for reference and future backend integration

CREATE DATABASE informatika_hub;
USE informatika_hub;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'instructor', 'admin') DEFAULT 'student',
    phone VARCHAR(20),
    avatar TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    semester INT NOT NULL,
    sks INT NOT NULL,
    image TEXT,
    instructor_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES users(id)
);

-- Course videos table
CREATE TABLE course_videos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    youtube_url TEXT NOT NULL,
    duration VARCHAR(20),
    channel VARCHAR(100),
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- User course enrollments
CREATE TABLE enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    progress DECIMAL(5,2) DEFAULT 0.00,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (user_id, course_id)
);

-- Video progress tracking
CREATE TABLE video_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    video_id INT NOT NULL,
    watched_duration INT DEFAULT 0, -- in seconds
    completed BOOLEAN DEFAULT FALSE,
    last_watched TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES course_videos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_progress (user_id, video_id)
);

-- Website templates table
CREATE TABLE templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    image TEXT,
    demo_url TEXT,
    download_url TEXT,
    features JSON,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_sales INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Template purchases table
CREATE TABLE template_purchases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    template_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);

-- Service orders table (for website development services)
CREATE TABLE service_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    service_type ENUM('landing_page', 'business_website', 'ecommerce') NOT NULL,
    package_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    requirements TEXT,
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    delivery_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Contact messages table
CREATE TABLE contact_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status ENUM('new', 'read', 'replied') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Newsletter subscriptions table
CREATE TABLE newsletter_subscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    status ENUM('active', 'unsubscribed') DEFAULT 'active',
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO courses (title, description, semester, sks, image) VALUES
('Algoritma dan Pemrograman', 'Mempelajari dasar-dasar algoritma dan konsep pemrograman menggunakan berbagai bahasa pemrograman.', 1, 3, 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=300&h=200&fit=crop'),
('Basis Data', 'Mempelajari konsep database, desain database, SQL, dan sistem manajemen basis data.', 3, 3, 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&h=200&fit=crop'),
('Pemrograman Web', 'Mempelajari teknologi web modern termasuk HTML, CSS, JavaScript, dan framework web.', 4, 3, 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=300&h=200&fit=crop');

-- Insert sample course videos
INSERT INTO course_videos (course_id, title, youtube_url, duration, channel, order_index) VALUES
(1, 'Introduction to Programming', 'https://www.youtube.com/embed/zOjov-2OZ0E', '45:30', 'Edureka', 1),
(1, 'Data Structures and Algorithms', 'https://www.youtube.com/embed/RBSGKlAvoiM', '13:44:44', 'FreeCodeCamp', 2),
(2, 'Database Design Course', 'https://www.youtube.com/embed/ztHopE5Wnpc', '8:36:42', 'FreeCodeCamp', 1),
(3, 'HTML CSS JavaScript Course', 'https://www.youtube.com/embed/mU6anWqZJcc', '11:22:42', 'FreeCodeCamp', 1);

-- Insert sample templates
INSERT INTO templates (title, description, category, price, image, features, rating) VALUES
('Modern Business Landing Page', 'Template landing page modern dan responsif untuk bisnis', 'Landing Page', 500000, 'https://images.unsplash.com/photo-1460925895917-adfb0aad7b2f?w=300&h=200&fit=crop', '["Desain Modern", "Responsif", "SEO Optimized"]', 4.8),
('E-Commerce Starter Kit', 'Template toko online lengkap dengan sistem pembayaran', 'E-Commerce', 1500000, 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=300&h=200&fit=crop', '["Payment Gateway", "Admin Panel", "Inventory System"]', 4.9);
