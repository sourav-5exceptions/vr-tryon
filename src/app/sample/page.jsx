"use client";

import * as THREE from "three";
import { useEffect, useRef } from "react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";

const GogglesRenderer = () => {
  const canvasRef = useRef(null);
  const webcamRef = useRef(null);
  const netRef = useRef(null);

  useEffect(() => {
    // Initialize Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Load goggles texture
    const textureLoader = new THREE.TextureLoader();
    const gogglesTexture = textureLoader.load("/images/glass.png");

    // Create goggles mesh
    const gogglesGeometry = new THREE.PlaneGeometry(1, 1); // Adjust size as needed
    const gogglesMaterial = new THREE.MeshBasicMaterial({
      map: gogglesTexture,
      transparent: true,
    });
    const gogglesMesh = new THREE.Mesh(gogglesGeometry, gogglesMaterial);

    // Position goggles mesh
    // Example: You may want to adjust the position based on pose keypoints
    gogglesMesh.position.set(0, 0, -5); // Adjust position as needed
    scene.add(gogglesMesh);

    // Initialize Pose Detection
    const initPoseDetection = async () => {
      const net = await poseDetection.createDetector(
        poseDetection.SupportedModels.BlazePose
      );
      netRef.current = net;
    };

    initPoseDetection();

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };

    animate();

    // return () => {
    //   // Cleanup
    //   netRef.current.dispose();
    // };
  }, []);

  useEffect(() => {
    const detectPose = async () => {
      if (webcamRef.current && netRef.current) {
        const poses = await netRef.current.estimatePoses(
          webcamRef.current.video
        );
        // Example: Use pose keypoints to position the goggles mesh
      }
    };

    const intervalId = setInterval(detectPose, 100);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <>
      <video ref={webcamRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} />
    </>
  );
};

export default GogglesRenderer;
