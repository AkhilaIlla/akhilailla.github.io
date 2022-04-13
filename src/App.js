import "./App.css";
import Globe from "react-globe.gl";
import { useEffect, useRef, useState } from "react";
import { parseCountries } from "./parseCountries";

function App() {
  const globeEl = useRef();
  const [countries, setCountries] = useState({ features: [] });
  const [altitude, setAltitude] = useState(0.1);
  const [transitionDuration, setTransitionDuration] = useState(1000);

  useEffect(() => {
    fetch("./countries.geojson")
      .then((res) => res.json())
      .then(async (res) => {
        const parsedCountries = await parseCountries(res);
        setCountries(parsedCountries);

        setTimeout(() => {
          setTransitionDuration(4000);
          setAltitude(
            () => (feat) =>
              Math.max(0.1, +feat.properties.CO2_LVL?.[2018] * 7e-2)
          );
        }, 3000);
      });
  }, []);

  useEffect(() => {
    // Auto-rotate
    globeEl.current.controls().autoRotate = true;
    globeEl.current.controls().autoRotateSpeed = 0.3;

    globeEl.current.pointOfView({ altitude: 4 }, 5000);
  }, []);

  return (
    <div className="App">
      <Globe
        ref={globeEl}
        // globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        polygonsData={countries.features.filter(
          (d) => d.properties.ISO_A2 !== "AQ"
        )}
        polygonAltitude={altitude}
        polygonCapColor={() => "rgba(200, 0, 0, 0.6)"}
        polygonSideColor={() => "rgba(0, 100, 0, 0.15)"}
        polygonLabel={({ properties: d }) => `
        <b>${d.ADMIN} (${d.ISO_A2})</b> <br />
        CO2 Emissions: <i>${
          Math.round(+d.CO2_LVL?.[2018] * 1000) / 1000
        } (metric tons per capita)</i>
      `}
        polygonsTransitionDuration={transitionDuration}
      />
    </div>
  );
}

export default App;
