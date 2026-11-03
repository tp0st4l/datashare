package fr.datashare.exception;

public class EmailAlreadyUsedException extends RuntimeException {
    public EmailAlreadyUsedException() {
        super("Un compte existe déjà avec cet email");
    }
}