import { createClient } from '@supabase/supabase-js';

// Get environment variables (in production, these would come from actual env vars)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

// Database service class
export class SupabaseService {
  constructor() {
    this.supabase = supabase;
  }

  // Authentication methods
  async signUp(email, password, userData) {
    try {
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: userData.name
          }
        }
      });

      if (authError) throw authError;

      // Create user profile
      if (authData.user) {
        const { error: profileError } = await this.supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email: authData.user.email,
              full_name: userData.name,
              created_at: new Date().toISOString()
            }
          ]);

        if (profileError) throw profileError;
      }

      return authData;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  async signIn(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await this.supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        return { ...user, profile };
      }
      
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  // Course methods
  async getCourses() {
    try {
      const { data, error } = await this.supabase
        .from('courses')
        .select(`
          *,
          course_videos (
            id,
            title,
            youtube_url,
            duration,
            channel,
            order_index
          )
        `)
        .order('semester', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get courses error:', error);
      return [];
    }
  }

  async getCourseById(courseId) {
    try {
      const { data, error } = await this.supabase
        .from('courses')
        .select(`
          *,
          course_videos (
            id,
            title,
            youtube_url,
            duration,
            channel,
            order_index
          )
        `)
        .eq('id', courseId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get course by ID error:', error);
      return null;
    }
  }

  // Template methods
  async getTemplates(categoryId = null, limit = 12, offset = 0) {
    try {
      let query = this.supabase
        .from('templates')
        .select(`
          *,
          categories (
            id,
            name
          )
        `)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get templates error:', error);
      return [];
    }
  }

  async getCategories() {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get categories error:', error);
      return [];
    }
  }

  // User progress methods
  async getUserProgress(userId) {
    try {
      const { data, error } = await this.supabase
        .from('user_progress')
        .select(`
          *,
          courses (
            id,
            title
          ),
          course_videos (
            id,
            title
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get user progress error:', error);
      return [];
    }
  }

  async updateProgress(userId, courseId, videoId, progressData) {
    try {
      const { data, error } = await this.supabase
        .from('user_progress')
        .upsert([
          {
            user_id: userId,
            course_id: courseId,
            video_id: videoId,
            ...progressData,
            updated_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update progress error:', error);
      throw error;
    }
  }

  // Order methods
  async createOrder(orderData) {
    try {
      const { data, error } = await this.supabase
        .from('orders')
        .insert([
          {
            ...orderData,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create order error:', error);
      throw error;
    }
  }

  async getUserOrders(userId) {
    try {
      const { data, error } = await this.supabase
        .from('orders')
        .select(`
          *,
          templates (
            id,
            title,
            price
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get user orders error:', error);
      return [];
    }
  }

  // Review methods
  async getTemplateReviews(templateId) {
    try {
      const { data, error } = await this.supabase
        .from('reviews')
        .select(`
          *,
          users (
            full_name
          )
        `)
        .eq('template_id', templateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get template reviews error:', error);
      return [];
    }
  }

  async createReview(reviewData) {
    try {
      const { data, error } = await this.supabase
        .from('reviews')
        .insert([
          {
            ...reviewData,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create review error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const dbService = new SupabaseService();
