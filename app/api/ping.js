function handler(request, response) {
  response.status(200).json({
    ok: true,
    route: '/api/ping',
    method: request.method,
  });
}

module.exports = handler;
