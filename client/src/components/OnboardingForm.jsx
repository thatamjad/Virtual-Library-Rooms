import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Box
} from '@mui/material';

const OnboardingForm = () => {
  const [formData, setFormData] = useState({
    organizationName: '',
    domain: '',
    adminName: '',
    adminEmail: '',
    adminPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/onboarding/organization`, {
        organizationName: formData.organizationName,
        domain: formData.domain.toLowerCase(),
        adminName: formData.adminName,
        adminEmail: formData.adminEmail.toLowerCase(),
        adminPassword: formData.adminPassword
      });

      console.log('Response:', response.data);
      localStorage.setItem('token', response.data.token);
      navigate('/rooms');
    } catch (error) {
      console.error('Full error:', error);
      let errorMessage = 'Failed to create organization';
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        if (error.response.data.code === 'DOMAIN_EXISTS') {
          errorMessage = 'This domain is already registered';
        } else if (error.response.data.code === 'EMAIL_EXISTS') {
          errorMessage = 'This admin email is already registered';
        } else if (error.response.data.code === 'ONBOARDING_FAILED') {
          errorMessage = error.response.data.message || 'Failed to create organization';
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please try again later.';
      } else {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Register Organization
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Organization Name"
            margin="normal"
            required
            value={formData.organizationName}
            onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
          />
          <TextField
            fullWidth
            label="Domain (e.g., company.com)"
            margin="normal"
            required
            value={formData.domain}
            onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
            helperText="Users with this domain can register"
          />
          <TextField
            fullWidth
            label="Admin Name"
            margin="normal"
            required
            value={formData.adminName}
            onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
          />
          <TextField
            fullWidth
            label="Admin Email"
            type="email"
            margin="normal"
            required
            value={formData.adminEmail}
            onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
          />
          <TextField
            fullWidth
            label="Admin Password"
            type="password"
            margin="normal"
            required
            value={formData.adminPassword}
            onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading}
          >
            {isLoading ? 'Creating Organization...' : 'Register Organization'}
          </Button>
        </form>
        
        <Box textAlign="center" mt={2}>
          <Typography variant="body2">
            Already have an organization?{' '}
            <Link to="/register" style={{ color: 'primary.main', textDecoration: 'none' }}>
              Register user account
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default OnboardingForm; 