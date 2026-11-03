package fr.datashare.exception;

public class FileAccessDeniedException extends RuntimeException {
    public FileAccessDeniedException() {
        super("Mot de passe incorrect");
    }
}