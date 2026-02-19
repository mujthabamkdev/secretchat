# SecretChat

SecretChat is a secure and private communication platform designed for seamless 1-on-1 video calling and instant messaging. Built with modern web technologies, it prioritizes user privacy and real-time interaction.

## Features

- **Secure Video Calls**: High-quality, peer-to-peer video calls using WebRTC. Includes screenshot protection and camera/mic controls.
- **Friend System**: Send, accept, and manage friend requests. Block unwanted users.
- **Micro-Social Network**: Profile pages with avatars and status updates.
- **Moderation Tools**: Built-in reporting system and automatic frame capture for administrative review to ensure a safe environment.
- **Admin Dashboard**: Comprehensive admin panel for managing users and reviewing reports.

## Technology Stack

- **Frontend**: [Next.js](https://nextjs.org) (App Router), React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (via Prisma ORM), SQLite for local development
- **Real-time**: WebRTC for video/audio, Server-Sent Events (SSE) or Polling for signaling
- **Storage**: Vercel Blob (for avatars/images)
- **Deployment**: Vercel

## Getting Started

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/mujthabamkdev/secretchat.git
    cd secretchat
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**

    Create a `.env` file in the root directory and add your database connection string and other secrets (see `.env.example` if available).

    ```env
    DATABASE_URL="file:./dev.db" # Or your PostgreSQL URL
    ```

4.  **Run Database Migrations:**

    ```bash
    npx prisma migrate dev
    ```

5.  **Start the development server:**

    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

-   `app/`: Next.js App Router pages and API routes.
-   `components/`: Reusable React components.
-   `prisma/`: Database schema and migrations.
-   `public/`: Static assets.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

[MIT](LICENSE)
