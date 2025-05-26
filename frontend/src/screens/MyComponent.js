import React from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

const MyComponent = ({ products, selectedProduct, setSelectedProduct, selectedQuantity, setSelectedQuantity, isAlternatingOrder,
    selectedDayType,
    setSelectedDayType }) => {
    const productOptions = products.map((product) => ({
        value: product.product_id,
        label: product.product_name+" ("+product.unit+")",
    }));

    const quantityOptions = [...Array(10).keys()].map((num) => ({
        value: num + 1,
        label: (num + 1).toString(),
    }));

    const dayTypeOptions = [
        { value: "ODD", label: "ODD" },
        { value: "EVEN", label: "EVEN" },
    ];

    return (
        <div>
            <Select
                placeholder="Select Product"
                value={productOptions.find((option) => option.value === selectedProduct)}
                onChange={(option) => setSelectedProduct(option.value)}
                options={productOptions}
            />

            <CreatableSelect
                value={quantityOptions.find((option) => option.value === selectedQuantity) || { value: selectedQuantity, label: selectedQuantity.toString() }}
                onChange={(option) => setSelectedQuantity(Number(option.value))}  // ✅ Convert to number
                onCreateOption={(inputValue) => {
                    const numericValue = Number(inputValue);
                    if (!isNaN(numericValue) && numericValue > 0) {
                        setSelectedQuantity(numericValue);
                    }
                }}
                options={quantityOptions}
                styles={{ marginTop: '10px' }}
            />

            {isAlternatingOrder && (
                <Select
                    placeholder="Select Day Type"
                    value={dayTypeOptions.find((option) => option.value === selectedDayType)}
                    onChange={(option) => setSelectedDayType(option.value)}
                    options={dayTypeOptions}
                    styles={{ marginTop: '10px' }}
                />
            )}
        </div>
    );
};

export default MyComponent;
