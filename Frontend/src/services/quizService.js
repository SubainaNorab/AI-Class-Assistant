// Frontend/src/services/quizService.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging (optional)
apiClient.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

const quizService = {
  // Fetch all quizzes with optional filters
  getQuizzes: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      // Add filters to query params if they exist
      if (filters.search) params.append('search', filters.search);
      if (filters.lecture) params.append('lecture', filters.lecture);
      if (filters.difficulty && filters.difficulty !== 'all') {
        params.append('difficulty', filters.difficulty);
      }
      if (filters.date) params.append('date', filters.date);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      
      const queryString = params.toString();
      const url = queryString ? `/quiz?${queryString}` : '/quiz';
      
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      throw error;
    }
  },

  // Get a single quiz by ID
  getQuizById: async (quizId) => {
    try {
      const response = await apiClient.get(`/quiz/${quizId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching quiz by ID:', error);
      throw error;
    }
  },

  // Generate new quiz with metadata
  generateQuiz: async (data) => {
    try {
      const payload = {
        summary: data.summary,
        lecture_title: data.lecture_title,
        difficulty: data.difficulty || 'Medium',
        topic_tags: data.topic_tags || [],
        time_taken: 0 // Will be updated when quiz is completed
      };
      
      const response = await apiClient.post('/generate-quiz', payload);
      return response.data;
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw error;
    }
  },

  // Generate quiz from file upload
  generateQuizFromFile: async (file, metadata = {}) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add metadata to form data
      Object.keys(metadata).forEach(key => {
        if (metadata[key] !== undefined && metadata[key] !== null) {
          formData.append(key, metadata[key]);
        }
      });
      
      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },

  // Save quiz result after completion
  saveQuizResult: async (result) => {
    try {
      const payload = {
        quiz_id: result.quizId,
        is_correct: result.isCorrect,
        time_taken: result.timeTaken,
        selected_answer: result.selectedAnswer,
        correct_answer: result.correctAnswer,
        timestamp: new Date().toISOString()
      };
      
      const response = await apiClient.post('/quiz-results', payload);
      return response.data;
    } catch (error) {
      console.error('Error saving quiz result:', error);
      // Don't throw error for result saving - allow app to continue
      return null;
    }
  },

  // Get quiz statistics
  getQuizStats: async () => {
    try {
      const response = await apiClient.get('/progress');
      return response.data;
    } catch (error) {
      console.error('Error fetching quiz stats:', error);
      throw error;
    }
  },

  // Get user's quiz history
  getQuizHistory: async (userId) => {
    try {
      const response = await apiClient.get(`/quiz-history/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching quiz history:', error);
      throw error;
    }
  },

  // Submit feedback for a quiz
  submitQuizFeedback: async (feedbackData) => {
    try {
      const payload = {
        type: 'quiz',
        item_id: feedbackData.quizId,
        rating: feedbackData.rating,
        comment: feedbackData.comment || ''
      };
      
      const response = await apiClient.post('/feedback', payload);
      return response.data;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  },

  // Get flashcards (bonus - since they're related)
  getFlashcards: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.lecture) params.append('lecture', filters.lecture);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      
      const queryString = params.toString();
      const url = queryString ? `/flashcards?${queryString}` : '/flashcards';
      
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching flashcards:', error);
      throw error;
    }
  },

  // Summarize text (for quiz generation)
  summarizeText: async (text) => {
    try {
      const response = await apiClient.post('/summarize', { text });
      return response.data;
    } catch (error) {
      console.error('Error summarizing text:', error);
      throw error;
    }
  },

  // Delete a quiz (if needed)
  deleteQuiz: async (quizId) => {
    try {
      const response = await apiClient.delete(`/quiz/${quizId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting quiz:', error);
      throw error;
    }
  },

  // Update quiz metadata
  updateQuizMetadata: async (quizId, metadata) => {
    try {
      const response = await apiClient.patch(`/quiz/${quizId}`, metadata);
      return response.data;
    } catch (error) {
      console.error('Error updating quiz metadata:', error);
      throw error;
    }
  }
};

export default quizService;