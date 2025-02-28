import { createRouter } from 'next-connect';

const router = createRouter();

router.get((req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'next-connect is working correctly',
    timestamp: new Date().toISOString()
  });
});

export default router.handler(); 