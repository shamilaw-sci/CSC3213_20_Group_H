export const verifyAdmin = (req, res, next) => {
    if (!req.user || !req.user.role) {
        return res.status(401).json({ error: 'Unauthorized: No role specified.' });
    }

    const userRole = String(req.user.role).toLowerCase();

    if (userRole !== 'admin' && userRole !== 'supervisor') {
        return res.status(403).json({ error: 'Access forbidden: Admin or Supervisor privileges required.' });
    }
    
    next();
};