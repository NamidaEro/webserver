# Webserver Project

This is a Next.js-based webserver project designed to be deployed using Docker and CI/CD pipelines.

## Features
- Built with Next.js
- Dockerized for easy deployment
- CI/CD pipeline using GitHub Actions
- Firebase Firestore data caching
- WoW Auction House data API integration

## Firebase Firestore Integration
This project uses Firebase Firestore for caching data from external APIs:

1. **Data Persistence**: Auction data fetched from WoW API is stored in Firestore
2. **Performance Optimization**: Reduces API calls by reusing cached data
3. **Status Monitoring**: UI component displays the current state of cached data

### Firebase Setup
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Set up Firestore database
3. Configure security rules (see `FIREBASE_SECURITY_RULES.md` and `firestore.rules`)
4. Add Firebase configuration to your environment variables

## How to Run Locally
1. Install dependencies:
   ```bash
   yarn install
   ```
2. Start the development server:
   ```bash
   yarn dev
   ```

## How to Build and Run with Docker
1. Build the Docker image:
   ```bash
   docker build -t nodeweb:latest .
   ```
2. Run the Docker container:
   ```bash
   docker run -d -p 3000:3000 nodeweb:latest
   ```

## CI/CD Pipeline
This project includes a GitHub Actions workflow to automate deployment to an Azure VM. The pipeline performs the following steps:
1. Builds the Docker image.
2. Pushes the image to Docker Hub.
3. Deploys the image to an Azure VM via SSH.

## Repository
[GitHub Repository](https://github.com/NamidaEro/webserver)
