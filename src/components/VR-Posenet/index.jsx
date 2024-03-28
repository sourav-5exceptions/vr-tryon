"use client";

import * as poseDetection from "@tensorflow-models/pose-detection";

import * as tf from "@tensorflow/tfjs-core";
// Register one of the TF.js backends.
import "@tensorflow/tfjs-backend-webgl";

import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";

const VRPosenet = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [net, setNet] = useState(null);

  const detectorConfig = {
    architecture: "MobileNetV1",
    outputStride: 16,
    inputResolution: { width: 520, height: 400 },
    multiplier: 0.75,
  };

  const detectPoses = async () => {
    if (webcamRef.current && webcamRef.current.video.readyState === 4) {
      const webcamElement = webcamRef.current.video;
      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;

      //set video width
      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      const poses = await net.estimatePoses(webcamElement);
      console.log("poses", poses);

      if (canvasRef.current) {
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;
        const ctx = canvasRef.current.getContext("2d");

        // Clear previous drawings
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        // Draw each pose
        poses.forEach(({ keypoints }) => {
          keypoints.forEach(({ x, y }) => {
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = "lightblue";
            ctx.fill();
          });
        });
      }
    }
  };

  const loadPoseNet = async () => {
    await tf.ready();
    const net = await poseDetection.createDetector(
      poseDetection.SupportedModels.PoseNet,
      detectorConfig
    );

    setNet(net);
  };

  useEffect(() => {
    loadPoseNet();
  }, []);

  useEffect(() => {
    if (net) {
      const intervalId = setInterval(detectPoses, 100);
      return () => clearInterval(intervalId);
    }
  }, [net]);

  return (
    <div>
      <Webcam
        className="absolute mx-auto left-0 right-0 text-center"
        style={{ width: 640, height: 480 }}
        ref={webcamRef}
      />

      <canvas
        className="absolute mx-auto left-0 right-0 text-center"
        style={{ width: 640, height: 480 }}
        ref={canvasRef}
      />
    </div>
  );
};

export default VRPosenet;
