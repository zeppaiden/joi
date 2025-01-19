# Joi

Joi is a customer relationship management tool for AI-driven workflows. 

## Getting Started

1. **Create Supabase Project**
   - Create a new project at [database.new](https://database.new)

2. **Environment Setup**
   - Create `.env.local` file in the root directory:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   Both values can be found in your [Supabase project's API settings](https://app.supabase.com/project/_/settings/api)

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run cypress` - Open Cypress test runner
- `npm run cypress:run` - Run Cypress tests
