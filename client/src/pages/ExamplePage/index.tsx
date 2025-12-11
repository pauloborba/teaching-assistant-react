import React from 'react';
import Header from '../../components/Header';
import CustomButton from '../../components/CustomButton';

const ExamplePage: React.FC = () => {
    return (
        <div className="App">
            <Header />
            <CustomButton label="Click me" />
        </div>
    );
};

export default ExamplePage;