import "./App.css";
import "./index.css";
import Globe from "react-globe.gl";
import { useEffect, useRef, useState } from "react";
import { parseCountries } from "./parseCountries";

import Slider from "@mui/material/Slider";
import { IconButton } from "@mui/material";
import { PlayCircle } from "@mui/icons-material";
import { MAX_YEAR, MIN_YEAR, TIMELAPSE_INTERVAL } from "./constants";

/*

THINGS TO DO:

- style slider
- style year text
- refine scale of datapoints (log)
- make dropdown for different data (co2 VS co2_per_capita)

*/

const getAltitudeCalculationFunction = (year) => (feat) =>
  Math.max(
    0.05,
    getBaseLog(3, +feat.properties.CO2_DATA_BY_YEAR?.[year]?.co2) * 10e-2 -
      10e-2
  );

function getBaseLog(x, y) {
  return Math.log(y) / Math.log(x);
}

function App() {
  const globeEl = useRef();
  const [countries, setCountries] = useState({ features: [] });
  const [altitude, setAltitude] = useState(0.1);
  const [transitionDuration, setTransitionDuration] = useState(1000);
  const [year, setYear] = useState(2020);
  const timeouts = useRef([]);

  // Keep track of the latest year to handle edge case when user selects a year before the globe fully renders
  const latestYear = useRef(year);
  useEffect(() => {
    latestYear.current = year;
  });

  useEffect(() => {
    Promise.all([fetch("./countries.geojson"), fetch("./owid-co2-data.json")])
      .then(([countriesRes, co2Res]) =>
        Promise.all([countriesRes.json(), co2Res.json()])
      )
      .then(([countries, co2Data]) => {
        const parsedCountries = parseCountries(countries, co2Data);
        setCountries(parsedCountries);

        setTimeout(() => {
          setAltitude(() => getAltitudeCalculationFunction(latestYear.current));
        }, 1000);
      });
  }, []);

  useEffect(() => {
    // Auto-rotate
    globeEl.current.controls().autoRotate = true;
    globeEl.current.controls().autoRotateSpeed = 0.3;

    globeEl.current.pointOfView({ altitude: 4 }, 5000);
  }, []);

  const clearTimeouts = () => {
    for (const timeout of timeouts.current) {
      clearTimeout(timeout);
    }
    timeouts.current = [];
  };

  const changeYear = (e) => {
    clearTimeouts();

    const newYear = e.target.value;
    setYear(newYear);
    setTransitionDuration(100);
    setAltitude(() => getAltitudeCalculationFunction(newYear));
  };

  const beginTimelapse = () => {
    if (timeouts.current.length) clearTimeouts();

    let j = 0;
    for (let i = MIN_YEAR; i <= MAX_YEAR; ++i) {
      timeouts.current.push(
        setTimeout(() => {
          setYear(i);
          setTransitionDuration(TIMELAPSE_INTERVAL);
          setAltitude(() => getAltitudeCalculationFunction(i));
        }, j * TIMELAPSE_INTERVAL)
      );
      ++j;
    }
    setTimeout(() => {
      timeouts.current = [];
    }, j * TIMELAPSE_INTERVAL);
  };

  return (
    <div className="App">
      <div className="play-display">
        <IconButton
          aria-label="play"
          onClick={beginTimelapse}
          sx={{
            paddingRight: 2,
          }}
        >
          <PlayCircle
            sx={{
              width: 100,
              height: 100,
            }}
          />
        </IconButton>
        <div className="current-year">{year}</div>
        <div className="slider-container">
          <Slider
            aria-label="year"
            value={year}
            onChange={changeYear}
            step={1}
            min={MIN_YEAR}
            max={MAX_YEAR}
            valueLabelDisplay="auto"
          />
        </div>
      </div>
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        // globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        polygonsData={countries.features.filter(
          (d) => d.properties.ISO_A2 !== "AQ"
        )}
        polygonAltitude={altitude}
        polygonCapColor={() => "rgba(128,128,128, 0.9)"}
        polygonSideColor={() => "rgba(128,128,128, 0.15)"}
        polygonLabel={({ properties: d }) => `
        <b>${d.ADMIN} (${d.ISO_A2})</b> <br />
        CO2 Emissions: <i>${
          Math.round(+d.CO2_DATA_BY_YEAR?.[year]?.co2 * 1000) / 1000
        } (tons)</i>
      `}
        polygonsTransitionDuration={transitionDuration}
      />
    </div>
  );
}

export default App;
