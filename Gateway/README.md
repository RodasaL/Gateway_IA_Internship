 => Project Setup (Dockerized Environment)

 This project is fully dockerized, so setup is quick and simple.

 => Build & Run
 Run the following commands to build and start the project:
docker compose build --no-cache
docker compose up -d

 To follow the logs in real-time:
docker compose logs -f


 => Sending Files

 You can interact with the API using the provided Frontend,  Postman or any similar tool. (Remember that the video api only works with videos in english)

=> Postman:

 Endpoint:
 POST http://localhost:3000/process

 Form-data options:
 - file (file)   → Upload a local image or video
 - link (text)   → Send a URL instead of uploading a file
 - model_IA (text) → Choose the AI model to use

 Available model_IA values:
 1 → Enhance Image (AI Enhancement)
 2 → Remove Background (AI Background Removal)
 3 → Cut Video (AI Video Cutter)



=>Now this is the important part you have two ways to use the app, DEV and DEPLOY 

You will need to launch the DEPLOY WAY to use local videos and not only local ones

So basiclly the vizard api cant fetch from your minIO directly so you will need to make a tunnel for it 
This doesnt happen with the images because their api doenst directly download the image, you send the buffer 

DEV
So DEV way you will only be able to send:

-Video links 
-Imgs 

1.
create two public buckets at MinIO:

 Bucket 1: "original"
 Bucket 2: "processed"

2.
 Go to minIO service and change the minIO endpoint to MINIO_LOCAL

3.
Go to gateway controller and uncomment the Dev way and comment the Deploy way 

line 88



DEPLOY:

 => Public Access via Ngrok (for local videos uploads)

 1.
create two private buckets at MinIO:

 Bucket 1: "original"
 Bucket 2: "processed"

2.
 Go to minIO service and change the minIO endpoint to MINIO_PUBLIC_URL

3.
Go to gateway controller and uncomment the DEPLOY way and comment the DEV way 

line 88

=> i leave the ngrok installation Steps right down:


=> Frontend Note
 For frontend development, I'm using the "Go Live" extension to preview the frontend.


| Mode   | Supports Local Video Uploads? | Bucket Policy | MinIO Endpoint     | Uses Presigned URLs? | Frontend Location    |
| ------ | ----------------------------- | ------------- | ------------------ | -------------------- | -------------------- |
| DEV    | ❌ No                          | Public        | `MINIO_LOCAL`      | ❌ No (direct links)  | Same machine         |
| DEPLOY | ✅ Yes                         | Private       | `MINIO_PUBLIC_URL` | ✅ Yes                | Any machine (remote) |



=> Ngrok Installation Steps

=> Linux:
sudo apt update
sudo apt install unzip -y
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-stable-linux-amd64.zip
unzip ngrok-stable-linux-amd64.zip
sudo mv ngrok /usr/local/bin
 (You may need to restart your computer)

=> Windows:
 Go to https://ngrok.com/download
 After downloading, either:
 1. Add the path of ngrok.exe to your Environment Variables
 2. Or use it directly like: & "C:\Path\To\ngrok.exe"

=> After installation, run:
ngrok config add-authtoken YOUR_TOKEN
 Example:
ngrok config add-authtoken 2x5rLOxC3Sa7tT0Ipc0UUwCKfwS_3ys7njW3DPAefYrhJgbBb (You can actualy run this, its my token)

 Then expose your local MinIO:
ngrok http 9000

 You will see something like:
 Forwarding https://e29a-213-58-200-171.ngrok-free.app -> http://localhost:9000

=> Copy the generated HTTPS URL and update the .env file:
 MINIO_PUBLIC_URL=https://e29a-213-58-200-171.ngrok-free.app

=> If you rerun ngrok later, the URL will change, and you'll need to update it again.

- Ngrok Dashboard:
 http://127.0.0.1:4040

=>  Windows tip: If PATH is bugged and ngrok doesn't work globally, run it with full path:
 & "C:\Program Files (x86)\Ngrok\ngrok.exe" config add-authtoken YOUR_TOKEN
 & "C:\Program Files (x86)\Ngrok\ngrok.exe" http 9000


API'S USED:

FOR VIDEOS: https://vizard.ai/

FOR IMGS: https://yce.perfectcorp.com/pt