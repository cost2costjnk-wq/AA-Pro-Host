
const DEFAULT_USERNAME = 'cost2costjnk@gmail.com';
const DEFAULT_PASSWORD = 'Akash1415@';

export const authService = {
  getStoredCredentials() {
    const stored = localStorage.getItem('aapro_creds');
    if (stored) {
      return JSON.parse(stored);
    }
    return { username: DEFAULT_USERNAME, password: DEFAULT_PASSWORD };
  },

  login(username: string, password: string): boolean {
    const creds = this.getStoredCredentials();
    if (username === creds.username && password === creds.password) {
      localStorage.setItem('aapro_session', 'true');
      return true;
    }
    return false;
  },

  isAuthenticated(): boolean {
    return localStorage.getItem('aapro_session') === 'true';
  },

  logout() {
    localStorage.removeItem('aapro_session');
    window.location.reload();
  },

  updateCredentials(newUsername: string, newPassword: string) {
    localStorage.setItem('aapro_creds', JSON.stringify({
      username: newUsername,
      password: newPassword
    }));
  }
};
