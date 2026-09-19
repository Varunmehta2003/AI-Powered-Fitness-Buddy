import request from 'supertest';
import app from '../app';

// Set required env vars before tests
process.env['WATSONX_API_KEY'] = 'test_key';
process.env['WATSONX_PROJECT_ID'] = 'test_project';
process.env['WATSONX_URL'] = 'https://test.ml.cloud.ibm.com';
process.env['WATSONX_MODEL_ID'] = 'ibm/granite-test';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('Fitness Buddy API');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('POST /api/chat validation', () => {
  it('returns 400 when message is missing', async () => {
    const res = await request(app).post('/api/chat').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/message/i);
  });

  it('returns 400 when message is empty string', async () => {
    const res = await request(app).post('/api/chat').send({ message: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when message exceeds 2000 characters', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'a'.repeat(2001) });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/checkin validation', () => {
  it('returns 400 for invalid energyLevel', async () => {
    const res = await request(app)
      .post('/api/checkin')
      .send({ energyLevel: 'super', sorenessLevel: 'not_sore', availableMinutes: 30 });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid sorenessLevel', async () => {
    const res = await request(app)
      .post('/api/checkin')
      .send({ energyLevel: 'high', sorenessLevel: 'very', availableMinutes: 30 });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid availableMinutes', async () => {
    const res = await request(app)
      .post('/api/checkin')
      .send({ energyLevel: 'high', sorenessLevel: 'not_sore', availableMinutes: 15 });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/profile', () => {
  it('returns demo profile when userId=demo', async () => {
    const res = await request(app).get('/api/profile?userId=demo');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.profile.name).toBe('Demo User');
  });

  it('returns 404 for unknown userId', async () => {
    const res = await request(app).get('/api/profile?userId=unknown_xyz');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/profile', () => {
  it('creates a profile with valid input', async () => {
    const res = await request(app)
      .post('/api/profile')
      .send({
        name: 'Test User',
        goal: 'general_fitness',
        fitnessLevel: 'beginner',
        durationMinutes: 30,
        equipment: 'none',
        location: 'home',
        diet: 'vegetarian',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.profile.id).toBeDefined();
  });

  it('returns 400 with invalid goal', async () => {
    const res = await request(app)
      .post('/api/profile')
      .send({
        name: 'Test',
        goal: 'bad_goal',
        fitnessLevel: 'beginner',
        durationMinutes: 30,
        equipment: 'none',
        location: 'home',
        diet: 'vegetarian',
      });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/progress', () => {
  it('returns progress data for demo user', async () => {
    const res = await request(app).get('/api/progress?userId=demo');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.progress.currentStreak).toBe('number');
    expect(typeof res.body.progress.totalWorkouts).toBe('number');
  });
});

describe('POST /api/progress/complete-workout', () => {
  it('marks a workout complete and returns streak', async () => {
    const res = await request(app)
      .post('/api/progress/complete-workout')
      .send({
        userId: 'test_streak_user',
        title: 'Morning HIIT',
        durationMinutes: 30,
        feedback: 'perfect',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.streak).toBeGreaterThanOrEqual(1);
    expect(res.body.message).toBeDefined();
  });

  it('returns 400 for invalid feedback', async () => {
    const res = await request(app)
      .post('/api/progress/complete-workout')
      .send({
        userId: 'test_user',
        title: 'Workout',
        durationMinutes: 30,
        feedback: 'amazing', // invalid
      });
    expect(res.status).toBe(400);
  });
});
