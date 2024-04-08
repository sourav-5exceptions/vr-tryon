/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import * as THREE from "three";

import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
// Register one of the TF.js backends.
import "@tensorflow/tfjs-backend-webgl";
import Loader from "../Loader";

const VRPoseDetection = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [net, setNet] = useState(null);
  const [isLoading, setLoading] = useState(false);
  const [glassesMesh, setGlassesMesh] = useState(null);

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
          const nose = getBodyPartData("nose");

          if (leftEye && rightEye) {
            const eyeDistance = Math.sqrt(
              Math.pow(rightEye.x - leftEye.x, 2) +
                Math.pow(rightEye.y - leftEye.y, 2)
            );

            const scaleMultiplier = eyeDistance / 100; // Adjust glassWidth to match the model's width

            const scaleX = 0.01;
            const scaleY = -0.01;
            const offsetX = 0.05;
            const offsetY = 0.1;

            glassesMesh.position.x =
              ((leftEye.x + rightEye.x) / 2 - videoWidth / 2) * scaleX +
              offsetX;
            glassesMesh.position.y =
              ((leftEye.y + rightEye.y) / 2 - videoHeight / 2) * scaleY +
              offsetY;

            glassesMesh.position.z = Math.min(leftEye.z, rightEye.z) * 0.01;

            glassesMesh.scale.set(scaleMultiplier, -scaleMultiplier, 1);
            glassesMesh.position.z = 1;

            const eyeLine = new THREE.Vector2(
              rightEye.x - leftEye.x,
              rightEye.y - leftEye.y
            );
            const rotationZ = -Math.atan2(eyeLine.y, eyeLine.x);
            glassesMesh.rotation.z = rotationZ;
          }
        }
      }
    } catch (error) {
      console.log("Something went wrong while drawing canvas : ", error);
    }
  };

  const loadPoseNet = async () => {
    try {
      setLoading(true);
      await tf.ready();

      //movenet configurations start

      // const detectorConfig = {
      //   // modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
      //   modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      //   enableSmoothing: true,
      //   // minPoseScore: 0.6,
      //   multiPoseMaxDimension: 352,
      // };

      // const net = await poseDetection.createDetector(
      //   poseDetection.SupportedModels.MoveNet,
      //   detectorConfig
      // );

      //movenet configurations end

      // blazenet configurations start

      // const detectorConfig = {
      //   runtime: "tfjs",
      //   enableSmoothing: true,
      //   modelType: "full",
      // };
      const detectorConfig = {
        runtime: "tfjs",
        modelType: "lite",
        enableSmoothing: true,
        inputWidth: 256,
        inputHeight: 256,
        quantBytes: 2, // Set to 4 for int32 quantization
        architecture: "ResNet", // Use 'MobileNet' or 'ResNet'
        scoreThreshold: 0.5, // Minimum confidence score for detected keypoints
      };

      const net = await poseDetection.createDetector(
        poseDetection.SupportedModels.BlazePose,
        detectorConfig
      );

      //blazenet configurations end

      setNet(net);
      setLoading(false);
    } catch (error) {
      console.log("Error while loading model", error);
    }
  };

  useEffect(() => {
    try {
      loadPoseNet()
        .then(() => {
          // Three.js setup
          const width = 480;
          const height = 352;

          // Scene, camera, and renderer setup
          const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
          });

          renderer.setSize(width, height);
          renderer.domElement.id = "renderer-threejs";
          renderer.domElement.style.position = "absolute";
          renderer.domElement.style.right = "0px";
          renderer.domElement.style.left = "0px";
          renderer.domElement.style.width = width;
          renderer.domElement.style.height = height;
          renderer.domElement.style.margin = "auto";

          if (document.getElementById("renderer-threejs")) {
            document.getElementById("renderer-threejs").remove();
          }

          document
            .getElementById("pose-detector")
            .appendChild(renderer.domElement);

          const scene = new THREE.Scene();

          const camera = new THREE.PerspectiveCamera(
            75,
            width / height,
            0.1,
            1000
          );
          camera.position.set(0, 0, 5); //setting x, y and z-axis

          function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
          }

          renderer.setAnimationLoop(animate);

          const glassWidth = 3;
          const glassHeight = 1;
          // Glasses Mesh
          const textureLoader = new THREE.TextureLoader();
          textureLoader.load("/images/glass.png", (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            const geometry = new THREE.PlaneGeometry(glassWidth, glassHeight);
            const material = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
            });
            const glasses = new THREE.Mesh(geometry, material);
            // console.log("glasses", glasses);

            scene.add(glasses);
            setGlassesMesh(glasses);
          });
        })
        .catch((err) => {
          throw err;
        });
    } catch (error) {
      console.log("Initialization error : ", error);
    }
  }, []);

  useEffect(() => {
    if (net && glassesMesh) {
      const intervalId = setInterval(detectPoses, 0);
      // return () => clearInterval(intervalId);
    }
  }, [net, glassesMesh]);

  return (
    <>
      <div id="pose-detector" style={{ width: 480, height: 352 }}>
        <Webcam
          className="absolute mx-auto left-0 right-0"
          style={{ width: 480, height: 352 }}
          ref={webcamRef}
        />

        <canvas
          className="absolute mx-auto left-0 right-0"
          style={{ width: 480, height: 352 }}
          ref={canvasRef}
        />
      </div>

      <div>
        {/* //   <Webcam
        //     ref={webcamRef}
        //     autoPlay
        //     style={{ width: "480px", height: "352px", position: "absolute" }}
        //   />
        //   <canvas
        //     id="pose-output"
        //     ref={canvasRef}
        //     style={{
        //       width: "480px",
        //       height: "352px",
        //       position: "absolute",
        //       top: 0,
        //       left: 0,
        //     }}
        //   /> */}
      </div>
    </>
  );
};

export default VRPoseDetection;
