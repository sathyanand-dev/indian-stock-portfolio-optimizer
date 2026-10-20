export function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    full_name: user.fullName ?? null,
    phone: user.phone ?? null,
    avatar_url: user.avatarUrl ?? null,
    auth_provider: user.authProvider ?? 'local',
    has_password: Boolean(user.hashedPassword),
    email_verified: user.emailVerified ?? false,
    is_active: user.isActive,
    risk_tolerance: user.riskTolerance,
    investment_horizon: user.investmentHorizon,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

export function serializePreferences(prefs) {
  return {
    theme: prefs.theme,
    language: prefs.language,
    date_format: prefs.dateFormat,
    number_format: prefs.numberFormat,
    currency: prefs.currency,
    density: prefs.density,
    email_notifications: prefs.emailNotifications,
    portfolio_alerts: prefs.portfolioAlerts,
    market_news_alerts: prefs.marketNewsAlerts,
    performance_reports: prefs.performanceReports,
    ipo_alerts: prefs.ipoAlerts,
    digest_frequency: prefs.digestFrequency,
    data_retention: prefs.dataRetention,
    analytics_opt_in: prefs.analyticsOptIn,
    beta_features: prefs.betaFeatures,
    updated_at: prefs.updatedAt ?? null,
  };
}

export function serializeNotification(notification) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body ?? null,
    link: notification.link ?? null,
    severity: notification.severity,
    is_read: notification.isRead,
    email_sent: notification.emailSent,
    created_at: notification.createdAt,
    read_at: notification.readAt ?? null,
  };
}

export function serializeHolding(holding) {
  return {
    id: holding.id,
    portfolio_id: holding.portfolioId,
    symbol: holding.symbol,
    weight: holding.weight,
    quantity: holding.quantity,
    avg_purchase_price: holding.avgPurchasePrice,
    created_at: holding.createdAt,
    updated_at: holding.updatedAt,
  };
}

export function serializePortfolio(portfolio) {
  return {
    id: portfolio.id,
    name: portfolio.name,
    description: portfolio.description,
    user_id: portfolio.userId,
    is_active: portfolio.isActive,
    optimization_method: portfolio.optimizationMethod,
    risk_tolerance: portfolio.riskTolerance,
    investment_amount: portfolio.investmentAmount,
    expected_return: portfolio.expectedReturn,
    expected_volatility: portfolio.expectedVolatility,
    sharpe_ratio: portfolio.sharpeRatio,
    created_at: portfolio.createdAt,
    updated_at: portfolio.updatedAt,
    holdings: (portfolio.holdings || []).map(serializeHolding),
  };
}
