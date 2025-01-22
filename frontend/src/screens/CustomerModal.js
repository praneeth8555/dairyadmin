import React, { useState, useEffect } from "react";
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
    Input, Button, VStack
} from "@chakra-ui/react";
import axios from "axios";

const CustomerModal = ({ isOpen, onClose, fetchCustomers, editCustomer }) => {
    const [customer, setCustomer] = useState({
        name: "",
        apartment_id: "",
        room_number: "",
        phone_number: "",
        email: "",
        products: []
    });

    // Reset the form when modal opens or editCustomer changes
    useEffect(() => {
        if (editCustomer) {
            setCustomer({
                name: editCustomer.name || "",
                apartment_id: editCustomer.apartment_id || "",
                room_number: editCustomer.room_number || "",
                phone_number: editCustomer.phone_number || "",
                email: editCustomer.email || "",
                products: editCustomer.products || []
            });
        } else {
            // Reset form when adding a new customer
            setCustomer({ name: "", apartment_id: "", room_number: "", phone_number: "", email: "", products: [] });
        }
    }, [editCustomer, isOpen]); // Added isOpen to trigger reset when modal opens

    const handleSave = async () => {
        if (!customer.name || !customer.apartment_id || !customer.room_number) {
            alert("Please fill in all required fields");
            return;
        }

        try {
            if (editCustomer) {
                await axios.put(`http://localhost:8080/customers/${editCustomer.user_id}`, customer);
            } else {
                await axios.post("http://localhost:8080/customers", customer);
            }

            fetchCustomers();
            onClose();
        } catch (error) {
            alert("Error saving customer");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{editCustomer ? "Edit Customer" : "Add Customer"}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={3}>
                        <Input
                            placeholder="Name"
                            value={customer.name}
                            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                        />
                        <Input
                            placeholder="Apartment ID"
                            value={customer.apartment_id}
                            onChange={(e) => setCustomer({ ...customer, apartment_id: e.target.value })}
                        />
                        <Input
                            placeholder="Room No"
                            value={customer.room_number}
                            onChange={(e) => setCustomer({ ...customer, room_number: e.target.value })}
                        />
                        <Input
                            placeholder="Phone Number"
                            value={customer.phone_number || ""}
                            onChange={(e) => setCustomer({ ...customer, phone_number: e.target.value })}
                        />
                        <Input
                            placeholder="Email"
                            value={customer.email || ""}
                            onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                        />
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="green" onClick={handleSave}>
                        {editCustomer ? "Save Changes" : "Add Customer"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default CustomerModal;
