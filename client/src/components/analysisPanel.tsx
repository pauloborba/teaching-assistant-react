import React, { useEffect, useState } from "react";
import ClassService from "../services/ClassService";
import { Class } from "../types/Class";


const AnalysisPanel: React.FC<{ classTopic: string; onClose: () => void }> = ({
  classTopic,
  onClose,
}) => {
  const [classData, setClassData] = useState<Class[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchClassData = async () => {
      try {
        setLoading(true);
        const data = await ClassService.getClassByTopic(classTopic);
        setClassData(data);
        console.log("Fetched class data:", data);
      } catch (error) {
        console.error("Error fetching class data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (classTopic) {
      fetchClassData();
    }
  }, [classTopic]);

  return (
    <>
      {classTopic && (
     <div className='enrollment-overlay'>
      <div className='enrollment-modal'>
       <div className='enrollment-modal-header'>
        <h2>Analysis for {classTopic}</h2>
        <button
         className="close-modal-btn"
         onClick={onClose}
         title="Close"
        >
         ×
        </button>
       </div>
       <div
        style={{
         display: 'flex',
         flexDirection: 'row',
        }}
       >
        {loading ? (
          <p>Loading class data...</p>
        ) : classData ? (
          <pre>{JSON.stringify(classData, null, 2)}</pre>
        ) : (
          <p>No data found for this class.</p>
        )}

        
       </div>
      </div>
     </div>
      )}
    </>
  );
}

export default AnalysisPanel;
