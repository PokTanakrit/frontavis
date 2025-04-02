import React, { useEffect, useState } from "react";
import Slider from "react-slick";
import "./Newsfeed.css";

const API_URL = "https://d51c-202-44-40-196.ngrok-free.app/linkimage";

const CustomPrevArrow = ({ onClick }) => (
  <div className="custom-arrow custom-prev" onClick={onClick}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

const CustomNextArrow = ({ onClick }) => (
  <div className="custom-arrow custom-next" onClick={onClick}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

const Newsfeed = () => {
  const defaultImages = [
    "/images/1.jpg",
    "/images/2.jpg"
  ];
  
  const [images, setImages] = useState(defaultImages);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch(API_URL, {
          headers: {
            "ngrok-skip-browser-warning": "true",
            "User-Agent": "Custom User-Agent",
          },
        });
  
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`);
        }
  
        const contentType = response.headers.get("Content-Type");
        if (contentType?.includes("application/json")) {
          const data = await response.json();
          console.log("API images:", data.image_urls);
          console.log("Default images:", defaultImages);
  
          if (Array.isArray(data.image_urls) && data.image_urls.length > 0) {
            const combinedImages = [...defaultImages, ...data.image_urls];
            console.log("Final combined images:", combinedImages); // ✅ ตรวจสอบค่าก่อน set
            setImages(combinedImages);
          } else {
            console.warn("Invalid API response or empty data. Using default images.");
            setImages(defaultImages);
          }
        } else {
          throw new Error(`Expected JSON, but received ${contentType}`);
        }
      } catch (error) {
        console.error("Fetch error:", error);
        setImages(defaultImages);
      } finally {
        setLoading(false);
      }
    };
  
    fetchImages();
  }, []);
  
  console.log("Final images in state:", images);
  

  console.log(images)

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 250,
    autoplay: true, // ✅ ให้เลื่อนอัตโนมัติ
    autoplaySpeed: 5000, // ✅ ทุก 5 วินาที
    slidesToShow: 1,
    slidesToScroll: 1,
    nextArrow: <CustomNextArrow />,
    prevArrow: <CustomPrevArrow />,
    pauseOnHover: false,  // ✅ ป้องกันหยุดเมื่อโฮเวอร์
    pauseOnFocus: false,  // ✅ ป้องกันหยุดเมื่อคลิก
  };

  return (
    <div className="slider-container">
      {loading ? <p>Loading...</p> : (
        <Slider {...sliderSettings}>
          {images.map((image, index) => (
            <div key={index} className="slider-item">
              <img src={image} alt={`Slide ${index + 1}`} className="slider-image" />
            </div>
          ))}
        </Slider>
      )}
    </div>
  );
};

export default Newsfeed;
