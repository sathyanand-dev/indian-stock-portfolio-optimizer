import apiClient from './client';

export async function optimizePortfolio(request) {
  const backendRequest = {
    symbols: request.symbols,
    optimization_type: request.optimization_type,
    risk_tolerance: request.risk_tolerance,
    target_return: request.target_return,
    risk_aversion: request.risk_aversion,
    confidence_level: request.confidence_level,
    lookback_period: request.lookback_period ?? '1y',
    num_simulations: request.num_simulations,
  };

  const response = await apiClient.post(
    '/api/v1/optimization/optimize',
    backendRequest
  );
  return response.data;
}

export async function optimizeWithConstraints(request) {
  const backendRequest = {
    symbols: request.symbols,
    optimization_type: request.optimization_type,
    risk_tolerance: request.risk_tolerance,
    lookback_period: request.lookback_period ?? '1y',
    min_weights: request.min_weights,
    max_weights: request.max_weights,
    num_simulations: request.num_simulations,
  };

  const response = await apiClient.post(
    '/api/v1/optimization/optimize',
    backendRequest
  );
  return response.data;
}
