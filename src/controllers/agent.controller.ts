import { NextFunction, Request, Response } from 'express';
import {IResponse} from "../interfaces/response.interface";
import {SendMessageDto} from "../dto/send-message.dto";
import {ChatOpenAI} from "@langchain/openai";
import {StartSessionDto} from "../dto/start-session.dto";
import {JSDOM} from "jsdom";

class AgentController {
    private static Sessions: {sessionId: string, messages: { role: string, content: string }[]}[] = [];
    
    private readonly _model = new ChatOpenAI({ model: "gpt-4" }); 
    
    public async startSession(request: Request, response: Response, next: NextFunction) {
        const result: IResponse = {
            data: null,
            error: null
        };

        try {
            const body = request.body as StartSessionDto;
            if (AgentController.Sessions.map(x => x.sessionId).includes(body.sessionId)) {
                result.error = "Session ID already exists";
                response.status(400).send(result);
                return;
            }
            
            AgentController.Sessions.push({
                sessionId: body.sessionId,
                messages: [{role: "system", content: body.prompt}]
            });
            
            response.status(200).send(result);
        } catch (e) {
            next(e);
        }
    }
    
    private getFromFromXml(xml: string): string {
        const dom = new JSDOM(xml, {contentType: "text/xml"});
        const from = dom.window.document.querySelector("from")?.textContent;
        
        if (from === null || from === undefined) {
            return "ai";
        }
        
        if (from == "human") {
            return from;
        } else {
            return "ai";
        }
    }
    
    public async sendMessage(request: Request, response: Response, next: NextFunction) {
        const result: IResponse = {
            data: null,
            error: null
        };
        
        try {
            const body = request.body as SendMessageDto;
            const session = AgentController.Sessions.find(x => x.sessionId === body.sessionId);
            if (session == null) {
                result.error = "Session ID not registered";
                response.status(400).send(result);
                return;
            }
            
            const from = this.getFromFromXml(body.message);
            session.messages.push({
                role: from,
                content: body.message
            });
            
            const aiResponse = (await this._model.invoke(session.messages)).content;
            session.messages.push({
                role: "ai",
                content: aiResponse.toString()
            });
            
            result.data = aiResponse.toString();
            response.status(200).send(result);
        } catch (e) {
            next(e);
        }
    }
}

export default new AgentController();
