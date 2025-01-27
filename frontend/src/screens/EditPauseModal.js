import React, { useState, useEffect } from "react";
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,

    FormControl,
    FormLabel,
    Input,
    
    useToast
} from "@chakra-ui/react";

import axios from "axios";

import CONFIG from "../config";
const EditPauseModal = ({ isOpen, onClose, customerId, fetchOrders }) => {

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const toast = useToast();

    useEffect(() => {
        if (isOpen) {
            setStartDate("");
            setEndDate("");
    
        }
    }, [isOpen]);


    const handlePauseOrder = async () => {
        if (!startDate || !endDate) {
            toast({ title: "Please select both start and end dates", status: "warning", duration: 3000, isClosable: true });
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            toast({ title: "Start date cannot be after end date", status: "error", duration: 3000, isClosable: true });
            return;
        }

        const payload = {
            user_id: customerId,
            start_date: startDate,
            end_date: endDate
        };

        try {
            await axios.post(`${CONFIG.API_BASE_URL}/orders/pause`, payload);
            toast({ title: "Order paused successfully", status: "success", duration: 3000, isClosable: true });
            fetchOrders();
            onClose();
        } catch (error) {
            toast({ title: "Error pausing order", status: "error", duration: 3000, isClosable: true });
        }
    };
    const handleResumeOrder = async () => {
        if (!startDate || !endDate) {
            toast({ title: "Please select both start and end dates", status: "warning", duration: 3000, isClosable: true });
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            toast({ title: "Start date cannot be after end date", status: "error", duration: 3000, isClosable: true });
            return;
        }

        const payload = {
            user_id: customerId,
            start_date: startDate,
            end_date: endDate
        };

        try {
            await axios.post(`${CONFIG.API_BASE_URL}/orders/resume`, payload);
            toast({ title: "DefaultOrder resumed successfully", status: "success", duration: 3000, isClosable: true });
            fetchOrders();
            onClose();
        } catch (error) {
            toast({ title: "Error resuming order", status: "error", duration: 3000, isClosable: true });
        }
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Pause/Resume Range</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <FormControl mb={4}>
                        <FormLabel>From Date</FormLabel>
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </FormControl>
                    <FormControl mb={4}>
                        <FormLabel>To Date</FormLabel>
                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </FormControl>
       
                </ModalBody>
                <ModalFooter>
                    <Button onClick={onClose} mr={3}>
                        Cancel
                    </Button>
                    <Button colorScheme="yellow" mr={3} onClick={handlePauseOrder}>
                        Pause Order
                    </Button>
                    <Button colorScheme="pink" mr={3} onClick={handleResumeOrder}>
                        Resume Order
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default EditPauseModal;
