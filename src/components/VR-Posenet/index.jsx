/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
// Register one of the TF.js backends.
import "@tensorflow/tfjs-backend-webgl";

const VRPosenet = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [net, setNet] = useState(null);
  const [glassesImg, setGlassesImg] = useState(null);

  const detectPoses = async () => {
    try {
      if (webcamRef.current && webcamRef.current.video.readyState === 4) {
        const webcamElement = webcamRef.current.video;
        const videoWidth = webcamRef.current.video.videoWidth;
        const videoHeight = webcamRef.current.video.videoHeight;

        //set video width
        webcamRef.current.video.width = videoWidth;
        webcamRef.current.video.height = videoHeight;

        const poses = await net.estimatePoses(webcamElement);
        console.log("Current pose keypoints : ", poses[0].keypoints);

        if (canvasRef.current) {
          canvasRef.current.width = videoWidth;
          canvasRef.current.height = videoHeight;
          const ctx = canvasRef.current.getContext("2d");

          // Clear previous drawings
          ctx.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );

          // Draw each pose over canvas
          // poses.forEach(({ keypoints }) => {
          //   keypoints.forEach(({ x, y }) => {
          //     ctx.beginPath();
          //     ctx.arc(x, y, 3, 0, 2 * Math.PI);
          //     ctx.fillStyle = "lightblue";
          //     ctx.fill();
          //   });
          // });

          const bodyPointsWithName = [];
          poses[0].keypoints.forEach(({ x, y, score, name }) => {
            bodyPointsWithName.push({ [name]: { x, y, score } });
          });

          const getBodyPartData = (key) => {
            for (const bodyPart of bodyPointsWithName) {
              if (Object.keys(bodyPart)[0] === key) {
                return bodyPart[key];
              }
            }
          };

          const leftEye = getBodyPartData("left_eye");
          const rightEye = getBodyPartData("right_eye");

          if (leftEye && rightEye) {
            const eyesDistance = rightEye.x - leftEye.x;
            const glassesWidth = eyesDistance * 2;
            const glassesHeight =
              glassesImg.height * (glassesWidth / glassesImg.width);

            const glassesX = leftEye.x - glassesWidth / 4;
            const glassesY = leftEye.y - glassesHeight / 2;

            ctx.drawImage(
              glassesImg,
              glassesX,
              glassesY,
              glassesWidth,
              glassesHeight
            );
          }
        }
      }
    } catch (error) {
      console.log("Something went wrong while drawing canvas : ", error);
    }
  };

  const loadPoseNet = async () => {
    await tf.ready();
    const net = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet
    );

    setNet(net);
  };

  useEffect(() => {
    const loadGlassesImage = async () => {
      const img = new Image();
      img.src = "/images/glass.png"; // Provide the path to your goggles image
      img.onload = () => {
        setGlassesImg(img);
      };
    };
    loadGlassesImage();
  }, []);

  useEffect(() => {
    loadPoseNet();
  }, []);

  useEffect(() => {
    if (net) {
      const intervalId = setInterval(detectPoses, 10);
      return () => clearInterval(intervalId);
    }
  }, [net]);

  return (
    <div>
      <Webcam
        className="absolute mx-auto left-0 right-0 text-center"
        style={{ width: 480, height: 360 }}
        ref={webcamRef}
      />

      <canvas
        className="absolute mx-auto left-0 right-0 text-center"
        style={{ width: 480, height: 360 }}
        ref={canvasRef}
      />
    </div>
  );
};

export default VRPosenet;
