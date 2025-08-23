import React, { useState, useEffect } from 'react';
import './HomeCircles.css';
import CountUp from "react-countup";

const HomeCircles = () => {
  const [stats, setStats] = useState({
    satisfiedPatients: 0,
    verifiedDoctors: 0,
    specialistDoctors: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Use fetch for public endpoint (no auth required)
        const response = await fetch('http://localhost:5015/api/public/stats');
        const result = await response.json();
        if (result.success) {
          setStats(result.data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Keep default values on error
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <section className="container circles">
      <div className="circle">
        <CountUp
          start={0}
          end={loading ? 0 : stats.satisfiedPatients}
          delay={0}
          enableScrollSpy={true}
          scrollSpyDelay={500}
        >
          {({ countUpRef }) => (
            <div className="counter">
              <span ref={countUpRef} />+
            </div>
          )}
        </CountUp>
        <span className="circle-name">
          Satisfied
          <br />
          Patients
        </span>
      </div>
      <div className="circle">
        <CountUp
          start={0}
          end={loading ? 0 : stats.verifiedDoctors}
          delay={0}
          enableScrollSpy={true}
          scrollSpyDelay={500}
        >
          {({ countUpRef }) => (
            <div className="counter">
              <span ref={countUpRef} />+
            </div>
          )}
        </CountUp>
        <span className="circle-name">
          Verified
          <br />
          Doctors
        </span>
      </div>
      <div className="circle">
        <CountUp
          start={0}
          end={loading ? 0 : stats.specialistDoctors}
          delay={0}
          enableScrollSpy={true}
          scrollSpyDelay={500}
        >
          {({ countUpRef }) => (
            <div className="counter">
              <span ref={countUpRef} />+
            </div>
          )}
        </CountUp>
        <span className="circle-name">
          Specialist
          <br />
          Doctors
        </span>
      </div>
    </section>
  );
};

export default HomeCircles;