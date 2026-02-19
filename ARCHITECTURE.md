# System Architecture

## Overview

SecretChat is a real-time communication platform built on Next.js. It facilitates secure 1-on-1 video calls via WebRTC and manages user interactions (friend requests, blocking) through a relational database.

## Architecture Diagram

```mermaid
graph TD
    subgraph Client [Client Side (Browser)]
        UI[User Interface (React/Next.js)]
        WebRTC[WebRTC Manager]
        Media[Media Devices (Camera/Mic)]
        
        UI --> WebRTC
        WebRTC --> Media
    end

    subgraph Server [Vercel / Serverless]
        NextApp[Next.js App Router]
        API[API Routes (/api)]
        Auth[Authentication (NextAuth/Custom)]
        Signal[Signaling Service (Polling/SSE)]
        
        UI -- HTTP/JSON --> API
        API --> Signal
    end

    subgraph Data [Data Layer]
        DB[(PostgreSQL / SQLite)]
        Blob[Vercel Blob Storage]
        
        API --> DB
        API --> Blob
    end

    subgraph P2P [Peer-to-Peer]
        PeerA[User A]
        PeerB[User B]
        
        PeerA -- "Video/Audio Stream (UDP)" --> PeerB
        PeerA -- "ICE Candidates / SDP (via Signal)" --> Signal --> PeerB
    end
```

## Component Description

1.  **Client Application**:
    *   **Framework**: Next.js (React)
    *   **State Management**: React Hooks (`useState`, `useEffect`, `useRef`)
    *   **Styling**: CSS Modules / TailwindCSS

2.  **Serverless Backend**:
    *   **Runtime**: Node.js (Vercel Serverless Functions)
    *   **API Routes**: Handle business logic (friend requests, user search).
    *   **Signaling**: Facilitates the WebRTC handshake (Offer/Answer/ICE) by storing messages in the database and allowing clients to poll for them.

3.  **Database**:
    *   **ORM**: Prisma
    *   **Stores**: specific user data, relationship status, call session metadata, and signaling messages.

4.  **Media & Storage**:
    *   **Call Frames**: Snapshots taken during calls for moderation are stored in Vercel Blob or as Base64.
    *   **WebRTC**: Direct P2P connection for streaming media to ensure low latency and privacy.
