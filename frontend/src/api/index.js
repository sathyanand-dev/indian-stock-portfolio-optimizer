/**
 * Compatibility facade matching the legacy apiService surface.
 * Feature modules should prefer the named domain APIs under ./api/*.
 */
import * as authApi from './auth.api';
import * as dataApi from './data.api';
import * as portfoliosApi from './portfolios.api';
import * as optimizationApi from './optimization.api';
import * as analyticsApi from './analytics.api';
import * as backtestingApi from './backtesting.api';
import * as researchApi from './research.api';
import * as ipoApi from './ipo.api';
import * as notificationsApi from './notifications.api';
import * as configApi from './config.api';

const apiService = {
  login: authApi.login,
  register: authApi.register,
  loginWithGoogle: authApi.loginWithGoogle,
  changePassword: authApi.changePassword,
  getCurrentUser: authApi.getCurrentUser,
  updateCurrentUser: authApi.updateCurrentUser,
  deleteCurrentUser: authApi.deleteCurrentUser,
  getPreferences: authApi.getPreferences,
  updatePreferences: authApi.updatePreferences,
  resetPreferences: authApi.resetPreferences,
  exportAccount: authApi.exportAccount,
  setToken: authApi.setToken,
  removeToken: authApi.removeToken,
  isAuthenticated: authApi.isAuthenticated,

  listNotifications: notificationsApi.listNotifications,
  markNotificationRead: notificationsApi.markNotificationRead,
  markAllNotificationsRead: notificationsApi.markAllNotificationsRead,
  clearNotifications: notificationsApi.clearNotifications,
  sendTestEmail: notificationsApi.sendTestEmail,

  getServerConfig: configApi.getServerConfig,

  getMarketIndices: dataApi.getMarketIndices,
  getStockQuote: dataApi.getStockQuote,
  getStockData: dataApi.getStockData,
  getMultipleStockData: dataApi.getMultipleStockData,
  searchSymbols: dataApi.searchSymbols,

  createPortfolio: portfoliosApi.createPortfolio,
  getPortfolios: portfoliosApi.getPortfolios,
  getPortfolio: portfoliosApi.getPortfolio,
  updatePortfolio: portfoliosApi.updatePortfolio,
  deletePortfolio: portfoliosApi.deletePortfolio,
  getPortfolioAnalytics: portfoliosApi.getPortfolioAnalytics,
  getPortfolioPerformance: portfoliosApi.getPortfolioPerformance,

  optimizePortfolio: optimizationApi.optimizePortfolio,
  optimizeWithConstraints: optimizationApi.optimizeWithConstraints,

  getPerformanceMetrics: analyticsApi.getPerformanceMetrics,

  runBacktest: backtestingApi.runBacktest,
  comparePortfolios: backtestingApi.comparePortfolios,

  getCompanyResearch: researchApi.getCompanyResearch,

  listIpos: ipoApi.listIpos,
  getIpo: ipoApi.getIpo,
  getIpoAnalysis: ipoApi.getIpoAnalysis,
};

export const {
  login,
  register,
  loginWithGoogle,
  changePassword,
  getCurrentUser,
  updateCurrentUser,
  deleteCurrentUser,
  getPreferences,
  updatePreferences,
  resetPreferences,
  exportAccount,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
  sendTestEmail,
  getServerConfig,
  setToken,
  removeToken,
  isAuthenticated,
  getMarketIndices,
  getStockQuote,
  getStockData,
  getMultipleStockData,
  searchSymbols,
  createPortfolio,
  getPortfolios,
  getPortfolio,
  updatePortfolio,
  deletePortfolio,
  getPortfolioAnalytics,
  getPortfolioPerformance,
  optimizePortfolio,
  optimizeWithConstraints,
  getPerformanceMetrics,
  runBacktest,
  comparePortfolios,
  getCompanyResearch,
  listIpos,
  getIpo,
  getIpoAnalysis,
} = apiService;

export default apiService;
